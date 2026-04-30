import httpx
import asyncio
from datetime import datetime, timezone, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("inmet_standalone")

async def get_inmet_data(station_code="A713"):
    """
    Tenta capturar os dados do INMET usando a técnica de 'scraping' de API 
    que o site oficial usa, que é mais estável que o endpoint de dados históricos.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://tempo.inmet.gov.br/",
        "Origin": "https://tempo.inmet.gov.br",
    }

    # Estratégia 1: Endpoint de Dados Horários (o que usamos no app)
    # Estratégia 2: Endpoint de Condição Atual (mais rápido)
    
    now = datetime.now(timezone.utc) - timedelta(hours=3)
    date_str = now.strftime("%Y-%m-%d")
    
    urls = [
        f"https://apitempo.inmet.gov.br/estacao/dados/{date_str}/{date_str}/{station_code}",
        f"https://apitempo.inmet.gov.br/estacao/{date_str}/{date_str}/{station_code}",
        f"https://apitempo.inmet.gov.br/condicao/A713/br" # Fallback condicao
    ]

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for url in urls:
            try:
                logger.info(f"Tentando INMET: {url}")
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 0:
                        # Filtrar os que tem VEN_VEL
                        valid = [o for o in data if o.get("VEN_VEL") is not None]
                        if valid:
                            obs = valid[-1]
                            logger.info(f"Sucesso INMET! Data: {obs.get('DT_MEDICAO')} {obs.get('HR_MEDICAO')}")
                            return obs
                    elif isinstance(data, dict):
                        logger.info("Sucesso INMET (dict)!")
                        return data
            except Exception as e:
                logger.error(f"Erro na URL {url}: {e}")
                continue
    return None

if __name__ == "__main__":
    res = asyncio.run(get_inmet_data())
    print("\nRESULTADO FINAL:")
    print(res)
