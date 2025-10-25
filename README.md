# 🧠 Obligatorisk Oppgave 2 – Anvendt AI  
**Fag:** Anvendt kunstig intelligens  
**Institusjon:** Høgskolen i Østfold  
**Student:** Mahmad Gumauri  
**Semester:** Høst 2025  

---

## 📘 Prosjektbeskrivelse
Dette prosjektet er utviklet som en del av emnet *Anvendt AI* ved Høgskolen i Østfold.  
Oppgaven gikk ut på å **kombinere ulike typer KI-verktøy**, en språkmodell, et kodeverktøy og en bildegenerator – for å lage en komplett og funksjonell nettside.

Jeg valgte å utvikle en **To-Do List nettside**, som lar brukeren legge til, fullføre og slette oppgaver, angi frister med nedtelling, og følge progresjonen gjennom en visuell fremdriftsindikator. Nettsiden støtter både **mørkt og lyst tema**, og bruker enkle overganger for en mer behagelig brukeropplevelse.

Formålet var å vise hvordan generative KI-modeller kan samarbeide for å produsere et praktisk, brukervennlig og estetisk sluttprodukt.

---

## 🧩 Brukte KI-verktøy

### 1. **Claude – Kodegenerering**
Claude ble brukt til å utvikle struktur og funksjonalitet i nettsiden.  
Jeg benyttet modellen til å generere HTML-, CSS- og JavaScript-kode, samt foreslå forbedringer i logikk, interaksjon og datastruktur.

### 2. **ChatGPT – Språkmodell og prompt-design**
ChatGPT ble brukt som språkmodell for å utforme **tekstlig innhold, grensesnittbeskrivelser og brukerhint** på nettsiden.  
I tillegg ble ChatGPT brukt aktivt til å **utforme og forbedre prompts** som ble sendt til de andre KI-verktøyene, slik at kommunikasjonen mellom modellene ble mer presis og effektiv.

### 3. **Leonardo AI – Bildegenerering**
Leonardo AI ble brukt til å lage grafiske elementer som **logo, ikoner og visuelle komponenter** til grensesnittet.  
Dette bidro til et mer helhetlig og profesjonelt uttrykk i designet. Bldene som ble generert ligger under "images" mappen

---

## 🖥️ Teknologier og filer

| Filnavn | Beskrivelse |
|----------|--------------|
| `index.html` | Hovedstruktur for nettsiden (HTML) |
| `style.css` | Design, layout og temahåndtering (lys/mørk modus) |
| `script.js` | Funksjonalitet for oppgaver, frister og progresjon |
| `/images/` | Mappe med grafiske elementer generert av Leonardo AI |

---

## ⚙️ Funksjonalitet
- Legg til, rediger og slett oppgaver  
- Sett **frist (deadline)** og vis **nedtelling**  
- Se **fremdrift/progress bar** (f.eks. 3/7 oppgaver fullført)  
- Visuelle overganger når oppgaver legges til, fullføres eller fjernes  
- Lys/mørk tema-bryter  
- Grønn markering for fullførte oppgaver og rød for utløpte frister  

---

## 🚀 Kjør prosjektet lokalt
1. Klon repositoriet:
   ```bash
   git clone https://github.com/<brukernavn>/anvendt-ai-oblig2.git
2. Åpne prosjektmappen: cd anvendt-ai-oblig2

3. Åpne index.html i nettleseren
