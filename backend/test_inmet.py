import httpx, json

headers = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0",
    "Referer": "https://tempo.inmet.gov.br/",
    "Origin": "https://tempo.inmet.gov.br",
}

# O site tempo.inmet.gov.br faz chamadas para carregar dados ao vivo
# Analisando o trafego do site, a rota real usada e diferente

urls_to_try = [
    "https://apitempo.inmet.gov.br/condicao/A713/br",
    "https://apitempo.inmet.gov.br/estacao/3/A713",
    "https://apitempo.inmet.gov.br/estacao/mais-recente/A713",
    "https://apitempo.inmet.gov.br/estacao/atual/A713",
    "https://apitempo.inmet.gov.br/estacao/A713/atual",
    # Tentar com dados do ultimo dia (formato ISO com timezone)
    "https://apitempo.inmet.gov.br/estacao/2026-04-27T09:00:00/2026-04-27T12:00:00/A713",
    # Tentar em outro servidor
    "https://tempo.inmet.gov.br/api/condicao/A713",
    "https://api.inmet.gov.br/estacao/dados/A713",
]

for url in urls_to_try:
    try:
        r = httpx.get(url, timeout=8, follow_redirects=True, headers=headers)
        body_preview = r.text[:150] if r.text else "(vazio)"
        print(f"[{r.status_code}] {url}")
        if r.status_code == 200:
            print(f"  *** SUCESSO *** body={body_preview}")
    except Exception as e:
        print(f"[ERR] {url}: {type(e).__name__}: {str(e)[:60]}")
    print()
