import csv
import sys

filename = '/root/meu-projeto-claude/dbantigodocliente/janeiro2026.csv'

def parse_value(v):
    if not v: return 0.0
    # Remove R$, dots, replace comma with dot
    # Ex: "R$ 1.200,50" -> "1200.50"
    # Ex: "150" -> "150.0"
    v = v.upper()
    clean = v.replace('R$', '').replace(' ', '')
    # Se tiver ponto e virgula? Padrao BRL: ponto = milhar, virgula = decimal
    # Mas as vezes CSV vem padrao US.
    # Assumindo padrao BRL dado o contexto (R$)
    clean = clean.replace('.', '').replace(',', '.')
    try:
        return float(clean)
    except:
        return 0.0

total = 0.0
count = 0

print("-" * 50)

try:
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            print("Arquivo vazio")
            sys.exit(1)
            
        header_lower = [h.strip().lower() for h in header]
        print(f"Header: {header_lower}")
        
        if 'valor' in header_lower:
            val_idx = header_lower.index('valor')
        else:
            val_idx = -1 
            
        for row in reader:
            if not row: continue
            if len(row) <= val_idx and val_idx != -1: continue
            
            val_str = row[val_idx]
            val = parse_value(val_str)
            if val > 0:
                total += val
            count += 1
            
    print(f"Total Registros Lidos: {count}")
    print(f"Soma Total: {total:.2f}")

except Exception as e:
    print(f"Erro: {e}")
