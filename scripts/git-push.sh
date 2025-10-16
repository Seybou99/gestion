#!/bin/bash

# 🚀 Script de commit et push automatique vers GitHub
# Utilisation : ./scripts/git-push.sh "Message du commit"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Script de commit et push vers GitHub${NC}"
echo ""

# Vérifier si un message de commit est fourni
if [ -z "$1" ]; then
  echo -e "${YELLOW}⚠️  Aucun message de commit fourni${NC}"
  echo -e "${BLUE}💬 Entrez votre message de commit :${NC}"
  read -p "Message: " commit_message
else
  commit_message="$1"
fi

# Aller dans le répertoire du projet
cd /Users/doumbia/Desktop/test

# Vérifier si Git est initialisé
if [ ! -d .git ]; then
  echo -e "${RED}❌ Erreur : Git n'est pas initialisé dans ce projet${NC}"
  exit 1
fi

# Afficher les fichiers modifiés
echo -e "${BLUE}📝 Fichiers modifiés :${NC}"
git status --short

echo ""
echo -e "${BLUE}➕ Ajout de tous les fichiers...${NC}"
git add .

echo ""
echo -e "${BLUE}💾 Création du commit...${NC}"
git commit -m "$commit_message"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Erreur lors du commit${NC}"
  exit 1
fi

# Vérifier si un remote est configuré
if ! git remote get-url origin > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Aucun remote GitHub configuré${NC}"
  echo -e "${BLUE}📝 Entrez l'URL de votre repository GitHub :${NC}"
  read -p "URL (ex: https://github.com/username/repo.git): " repo_url
  
  git remote add origin "$repo_url"
  echo -e "${GREEN}✅ Remote configuré : $repo_url${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Push vers GitHub...${NC}"
git push -u origin master 2>/dev/null || git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Code envoyé sur GitHub avec succès !${NC}"
  echo -e "${GREEN}🎉 Commit : $commit_message${NC}"
else
  echo ""
  echo -e "${RED}❌ Erreur lors du push${NC}"
  echo -e "${YELLOW}💡 Solutions possibles :${NC}"
  echo "   1. Vérifier vos identifiants GitHub"
  echo "   2. Utiliser un Personal Access Token"
  echo "   3. Configurer SSH"
  echo ""
  echo -e "${BLUE}📚 Consultez GUIDE_GIT_GITHUB.md pour plus d'aide${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}📊 Derniers commits :${NC}"
git log --oneline -5

echo ""
echo -e "${GREEN}🎊 Terminé !${NC}"

