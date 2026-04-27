import asyncio
import os
import sys

# Insere a raiz do backend no path para importar modulos do app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import FlightStatus
from app.agents.alert_agent import check_and_notify_status_change

async def run_bot_test():
    print("="*50)
    print("INICIANDO TESTE MANUAL DO ALERT AGENT (BOT)")
    print("="*50)

    db = SessionLocal()
    try:
        # Busca último registro real para simular uma transição a partir dele
        last_record = db.query(FlightStatus).order_by(FlightStatus.timestamp.desc()).first()
        
        if not last_record:
            print("Erro: Banco de dados de status vazio. Rode o sistema normal uma vez antes.")
            return

        print(f"Status Atual no Banco: {last_record.status}")
        
        # Cria um status de disparo oposto ao recem-adicionado
        new_status = "WARNING" if last_record.status == "SAFE" else "SAFE"
        
        # Salva o status forçado temporariamente
        fake_record = FlightStatus(
            timestamp=last_record.timestamp,  # usa o msm tempo para não sujar o dashboard
            status=new_status,
            risk_score=99.0 if new_status != "SAFE" else 5.0,
            reasons=[f"Teste forçado do Bot: transição de {last_record.status} para {new_status}"],
            confidence=1.0,
            sources_detail=[]
        )
        db.add(fake_record)
        db.commit()
        db.refresh(fake_record)
        
        print("\n[SIMULACAO] Disparada. O banco mudou de transicao. Processando Agente 7...")
        
        # Dispara o alerta
        await check_and_notify_status_change(db, fake_record)
        
        # Limpa o registro falso para não estragar a dashboard
        db.delete(fake_record)
        db.commit()
        print("\n[SUCESSO] Teste Concluido! O log do alerta deve ter sido impresso acima.")
        print("Para enviar para seu WhatsApp/Telegram de verdade, configure as chaves no terminal!")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_bot_test())
