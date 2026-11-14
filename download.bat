@echo off
rem Downloads the S-Pankki challenge data into "Challenge data\" (see Challenge data\README.md).
cd /d "%~dp0"
set "DATA=Challenge data"
if not exist "%DATA%" mkdir "%DATA%"
set BASE=https://github.com/hackjunction/Junction-2026-S-pankki/raw/main

for %%f in (tx_junction_transactions.csv tx_customers_junction.csv mtg_negotiation_history.csv mtg_tx_customer_link_and_final_mtg_infio.csv) do call :get %%f
echo Done.
exit /b

:get
if exist "%DATA%\%1" (
  findstr /c:"git-lfs.github.com" "%DATA%\%1" >nul || (echo OK   %1& exit /b)
)
echo GET  %1
curl -fL --progress-bar -o "%DATA%\%1" "%BASE%/%1"
exit /b
