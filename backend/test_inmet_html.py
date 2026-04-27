import urllib.request
import re
import json

url = 'https://tempo.inmet.gov.br/TabelaEstacoes/A713'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
    print('Tamanho HTML:', len(html))
    
    # regex for any api URL endpoint that might return data
    urls = re.findall(r'"(https://apitempo.*?(?:A713|\{codigo\}).*?)"', html)
    print('Found URLs related to apitempo:', list(set(urls)))
    
    # Check if there is data embedded in tokens or variables
    tokens = re.search(r"token\s*[:=]\s*['\"]([^'\"]+)['\"]", html)
    if tokens:
        print('Found token:', tokens.group(1))

except Exception as e:
    print('Error:', e)
