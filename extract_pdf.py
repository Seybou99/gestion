#!/usr/bin/env python3
"""Script pour extraire le texte d'un PDF"""

import sys
import os

try:
    # Essayer d'importer PyPDF2
    import PyPDF2
    
    pdf_path = os.path.expanduser("~/Desktop/documentation-3.pdf")
    
    if not os.path.exists(pdf_path):
        print(f"❌ Fichier non trouvé: {pdf_path}")
        sys.exit(1)
    
    print(f"📄 Extraction du texte de: {pdf_path}\n")
    print("=" * 80)
    
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        num_pages = len(pdf_reader.pages)
        
        print(f"\n📊 Nombre de pages: {num_pages}\n")
        print("=" * 80)
        
        for page_num in range(num_pages):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            
            print(f"\n--- PAGE {page_num + 1} ---\n")
            print(text)
            print("\n" + "=" * 80)
    
    print("\n✅ Extraction terminée!")
    
except ImportError:
    print("❌ PyPDF2 n'est pas installé.")
    print("📦 Installation de PyPDF2...")
    os.system("pip3 install PyPDF2 --quiet")
    print("✅ PyPDF2 installé! Relancez le script.")
    sys.exit(1)
    
except Exception as e:
    print(f"❌ Erreur: {e}")
    sys.exit(1)

