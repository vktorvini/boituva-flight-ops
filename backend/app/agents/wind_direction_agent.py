"""
Wind Direction Agent - Boituva Flight Ops v2
============================================
Responsável por converter graus meteorológicos em 
direção cardinal e prover o ângulo exato para a UI.
"""

def get_wind_direction_data(degrees: float) -> dict:
    """
    Converte graus (0-360) em dados estruturados de direção.
    
    Args:
        degrees (float): Direção do vento em graus.
        
    Returns:
        dict: Contém 'degrees', 'cardinal' e 'ui_rotation'
    """
    # Normalizar graus para 0-360
    norm_degrees = degrees % 360
    
    dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"]
    # 360 / 8 = 45 graus por setor
    idx = round(norm_degrees / 45) % 8
    
    return {
        "degrees": norm_degrees,
        "cardinal": dirs[idx],
        "ui_rotation": norm_degrees
    }
