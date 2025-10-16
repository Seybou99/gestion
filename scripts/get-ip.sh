#!/bin/bash
# Script pour obtenir l'IP locale automatiquement

# Fonction pour obtenir l'IP locale
get_local_ip() {
    # Essayer différentes méthodes selon l'OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}'
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        hostname -I | awk '{print $1}'
    else
        # Windows (Git Bash)
        ipconfig | grep "IPv4" | head -1 | awk '{print $NF}'
    fi
}

# Obtenir l'IP
LOCAL_IP=$(get_local_ip)

echo "IP locale détectée: $LOCAL_IP"
echo "URL backend: http://$LOCAL_IP:3000"

# Mettre à jour le fichier api.ts si demandé
if [ "$1" == "--update" ]; then
    echo "Mise à jour du fichier api.ts..."
    # Cette partie nécessiterait sed ou une autre méthode selon l'environnement
    echo "Veuillez mettre à jour manuellement API_BASE_URL avec: http://$LOCAL_IP:3000"
fi
