@echo off
echo ==========================================
echo DANG DONG BO DU LIEU GOOGLE SHEET...
echo ==========================================
powershell -Command "Invoke-WebRequest -Uri 'https://docs.google.com/spreadsheets/d/1UftvLAg15xIAjHGBAwtB8dP0wCJgTWFMtgONrTDqjzM/export?format=csv&gid=0' -OutFile 'data.csv'"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [ thanh cong ] Da tai du lieu moi nhat ve file data.csv
    echo.
    echo Buoc tiep theo:
    echo 1. Quay lai trinh duyet Dashboard.
    echo 2. Bam nut 'Choose File' va chon file 'data.csv' vua cap nhat.
) else (
    echo.
    echo [ LOI ] Khong the ket noi de tai du lieu. Vui long kiem tra mang.
)
pause
