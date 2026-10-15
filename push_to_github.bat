@echo off
echo Pushing full V2 -^> V3 commit history to https://github.com/Spade-IT/All-That-Jazz-Website.git ...
git remote set-url origin https://github.com/Spade-IT/All-That-Jazz-Website.git 2>nul || git remote add origin https://github.com/Spade-IT/All-That-Jazz-Website.git
git push -u origin main
echo Done! All commits are now live on GitHub.
pause
