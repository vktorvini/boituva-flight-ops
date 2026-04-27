"""
Alert Agent (Agent 7)
=====================
Responsável por monitorar as transições de status da operação (SAFE -> WARNING, etc.)
e disparar alertas para os pilotos/operadores.

Pode enviar via Webhook (para plugar na Evolution API / Z-API do WhatsApp)
ou via Telegram diretamente.
"""
import os
import httpx
import logging
from sqlalchemy.orm import Session
from app.models import FlightStatus, AlertHook, AlertLog

logger = logging.getLogger(__name__)

# Mantém suporte a .env legacy
WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


async def check_and_notify_status_change(db: Session, current_record: FlightStatus):
    """
    Compara o status atual com a leitura imediatamente anterior.
    Se o status operacional mudou, dispara alertas.
    """
    records = db.query(FlightStatus).order_by(FlightStatus.timestamp.desc()).limit(2).all()

    if len(records) < 2:
        logger.info("[AlertAgent] Sem histórico suficiente para comparar.")
        return

    curr = records[0]
    prev = records[1]

    if curr.status != prev.status:
        logger.info(f"[AlertAgent] Mudança de estado detectada: {prev.status} -> {curr.status}")
        await _dispatch_alert(db, curr, prev)
    else:
        logger.debug(f"[AlertAgent] Status mantido: {curr.status}. Sem disparo de alerta.")


def _format_message(curr: FlightStatus, prev: FlightStatus) -> str:
    emojis = {
        "SAFE": "✅ *VOO LIBERADO*",
        "WARNING": "⚠️ *VOO PROIBIDO (ATENÇÃO)*",
        "PROHIBITED": "🚫 *VOO FECHADO*"
    }
    
    title = emojis.get(curr.status, "ℹ️ *ATUALIZAÇÃO*")
    
    msg = f"Boituva Flight Ops\n{title}\n\n"
    msg += f"O status alterou de {prev.status} para {curr.status}.\n"
    msg += f"Risco atual: {int(curr.risk_score)}/100\n\n"
    
    msg += "*Motivos:*\n"
    for r in curr.reasons:
        msg += f"- {r}\n"
        
    msg += "\nAcesse o painel para verificar a janela completa."
    return msg


async def _dispatch_alert(db: Session, curr: FlightStatus, prev: FlightStatus):
    message = _format_message(curr, prev)
    
    # 1. Log console
    print("\n" + "="*50)
    print("[ALERTA] NOVO ALERTA DISPARADO:")
    try:
        print(message)
    except UnicodeEncodeError:
        print(message.encode("cp1252", errors="replace").decode("cp1252"))
    print("="*50 + "\n")

    success_count = 0

    # 2. Hooks Cadastrados no Banco (Novo Flow!)
    hooks = db.query(AlertHook).filter(AlertHook.is_active == 1).all()
    async with httpx.AsyncClient() as cl:
        for hook in hooks:
            try:
                resp = await cl.post(hook.url, json={"content": message, "text": message, "status": curr.status}, timeout=10)
                if resp.status_code in [200, 201, 204]:
                    success_count += 1
                logger.info(f"[AlertAgent] Disparo via DB Hook ({hook.name}): HTTP {resp.status_code}")
            except Exception as e:
                logger.error(f"[AlertAgent] Falha DB Hook ({hook.name}): {e}")

    # 3. Webhook Legacy (.env)
    if WEBHOOK_URL:
        try:
            async with httpx.AsyncClient() as cl:
                resp = await cl.post(WEBHOOK_URL, json={"text": message, "status": curr.status}, timeout=10)
                logger.info(f"[AlertAgent] Env Webhook: HTTP {resp.status_code}")
                success_count += 1
        except Exception as e:
            logger.error(f"[AlertAgent] Erro no Env webhook: {e}")

    # 4. Telegram (.env)
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        tg_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        try:
            async with httpx.AsyncClient() as cl:
                resp = await cl.post(tg_url, json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown"
                }, timeout=10)
                logger.info(f"[AlertAgent] Telegram: HTTP {resp.status_code}")
                success_count += 1
        except Exception as e:
            logger.error(f"[AlertAgent] Erro Telegram: {e}")

    # 5. Salva no DB o Log para visualização na Tela Interna
    log_entry = AlertLog(
        old_status=prev.status,
        new_status=curr.status,
        message_sent=message,
        success=1 if success_count > 0 else 0
    )
    db.add(log_entry)
    db.commit()
