@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   CONSERTAR GIT - APEX LOCACOES
echo ========================================
echo(
echo Este script NAO apaga nem altera nenhum arquivo seu.
echo Ele so reconecta o historico local ao que esta no GitHub.
echo(

if exist ".git\index.lock" (
  echo [aviso] Removendo trava antiga do git...
  del /f /q ".git\index.lock"
)

echo -- Buscando o historico que esta no GitHub...
git fetch origin
if errorlevel 1 goto falhou

echo -- Reconectando (seus arquivos permanecem exatamente como estao)...
git reset --mixed origin/main
if errorlevel 1 goto falhou

echo(
echo -- Suas alteracoes, que ficaram prontas para enviar:
git status --short
echo(
echo ========================================
echo   PRONTO.
echo   Agora rode o PUSH_UPDATE.bat normalmente.
echo ========================================
goto fim

:falhou
echo(
echo ========================================
echo   FALHOU - o erro esta acima. NADA foi alterado.
echo   Mande print para o Claude.
echo ========================================

:fim
echo(
pause
