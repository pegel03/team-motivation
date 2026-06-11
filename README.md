# Team Motivatie Checker 📈👥

Welkom bij de **Team Motivatie Checker**! Dit is een interactieve full-stack (React + Firebase) webapplicatie, speciaal ontworpen om de motivatie, energie en verbondenheid binnen teams periodiek te meten, live te visualiseren en constructief bespreekbaar te maken.

## Inhoudsopgave
1. [Over de applicatie](#1-over-de-applicatie)
2. [Kernfunctionaliteiten](#2-kernfunctionaliteiten)
3. [Rollen en Rechtenstructuur](#3-rollen-en-rechtenstructuur)
4. [Hoe de applicatie werkt (Gebruikersstroom)](#4-hoe-de-applicatie-werkt-gebruikersstroom)
5. [Koppeling met de Firebase Database](#5-koppeling-met-de-firebase-database)
6. [Veelgestelde vragen & Probleemoplossing](#6-veelgestelde-vragen--probleemoplossing)
7. [Omgevingsvariabelen (Environment Variables)](#7-omgevingsvariabelen-environment-variables)

---

## 1. Over de applicatie
Binnen elk modern team is sfeer, verbondenheid, energie en veerkracht essentieel voor succes en duurzaam werkgeluk. De **Team Motivatie Checker** stelt teamleden in staat om (anoniem voor collega's) een korte en wetenschappelijk onderbouwde motivatiecheck in te vullen. 
De resultaten worden live geaggregeerd en anoniem gevisualiseerd op overzichtelijke radardiagrammen, trendlijnen en gedetailleerde scorekaarten. Hierdoor kunnen teams en coaches direct zien waar de energie zit en welke gebieden om extra aandacht of dialoog vragen.

---

## 2. Kernfunctionaliteiten

*   **8-Vragen Motivatie Enquête**: Eenvoudige, snelle vragenlijst gebaseerd op cruciale dimensies van teamdynamiek:
    1.  *Enthousiasme* - Passie en plezier in het werk.
    2.  *Zingeving* - Doelgerichtheid van de dagelijkse werkzaamheden.
    3.  *Trots* - Trots zijn op teamprestaties en bijdrages.
    4.  *Uitdaging* - Voldoende intellectuele stimulans en professionele groei.
    5.  *Energie* - Mate van fitheid en vitaliteit gedurende de werkdag.
    6.  *Fitheid* - Kracht en emotionele uithoudingsvermogen in de werkomgeving.
    7.  *Veerkracht* - Hoe snel herstelt het team zich gezamenlijk van tegenslagen?
    8.  *Uithoudingsvermogen* - Duurzame inzetbaarheid en langdurige focus.
*   **Interactief Real-Time Dashboard**:
    *   **Motivatie-Index**: Directe visualisatie van de algemene gezondheid en energie-index van het geselecteerde team.
    *   **Historische Trends & Vergelijkingen**: Vergelijk resultaten tussen de huidige meetronde en historische metingen om patronen te ontdekken en vooruitgang te vieren.
    *   **Analyse per Categorie**: Zie direct in heldere radardiagrammen welke pijlers uitblinken en welke onder druk staan.
*   **Volledige Firebase Firestore Integratie**: Alle teams, ledenlijsten en enquête-inzendingen worden live gesynchroniseerd met Firestore, beveiligd met strikte security rules op basis van geauthenticeerde e-mailadressen.

---

## 3. Rollen en Rechtenstructuur

De applicatie kent drie toegangsniveaus om de privacy en autonomie van teams te waarborgen:

| Rol | Rechten | Doelgroep |
| :--- | :--- | :--- |
| **Teamlid** | Enquête invullen, algemene resultaten/dashboards inzien voor de teams waar ze deel van uitmaken. | Alle reguliere ontwikkelaars, testers, analisten, scrum-members, etc. |
| **Teambeheerder (Team Admin)** | Enquête invullen, resultaten inzien, dashboard-toegang in-/uitschakelen, de e-maillijst van de leden beheren en mede-beheerders aanstellen voor het eigen team. | Scrum Masters, Product Owners, of Team Leads. |
| **Systeembeheerder (Global Admin)** | Volledige admin-rechten over alle teams, aanmaken van nieuwe teams, aanpassen van alle instellingen en het beheren/forceren van initialisatie en demo data. | Platformbeheerders (veilig ingedeeld in de `admins` database collectie). |

---

## 4. Hoe de applicatie werkt (Gebruikersstroom)

### Stap 1: Inloggen
Gebruikers loggen in met hun e-mailadres (gekoppeld met Firebase Auth). Bij een succesvolle authenticatie controleert de applicatie in de Firestore database of de ingelogde gebruiker is ingedeeld in één of meerdere teams.

*   *Systeembeheerder logt in*: Als u inlogt met een e-mailadres geconfigureerd in de `admins` database collectie (bijvoorbeeld `beheer@logius.nl`), krijgt u direct toegang tot het volledige beheerderspaneel waarin nieuwe teams kunnen worden aangemaakt, verwijderd of gewijzigd.
*   *Teamlid logt in*: Als het e-mailadres op de ledenlijst (`memberEmails`) of beheerderslijst (`teamAdminEmails`) van een team staat, opent direct de hoofdpagina van dat team.

### Stap 2: Motivatie Enquête invullen
Hier kunnen gebruikers de 8 vragen beantwoorden op een schaal van 1 (Helemaal niet akkoord) tot 7 (Helemaal akkoord). 
*   **Overslaan optie**: Een teamlid of beheerder kan er ook voor kiezen de enquête over te slaan (*skip*). Dit telt wel mee als een actieve inzending (zodat de beheerder ziet dat iedereen heeft "deelgenomen"), maar beïnvloedt de gemiddelde teamscores niet. Dit garandeert dat de berekening nauwkeurig blijft en niemand gedwongen wordt om willekeurige scores in te vullen.

### Stap 3: Live Dashboard & Resultaten
Zodra de enquête is verstuurd (of overgeslagen), wordt de gebruiker direct doorgestuurd naar de live resultatenpagina.
*   **Privacy-waarborging**: Individuele antwoorden zijn *nooit* direct herleidbaar naar personen in het dashboard; er worden uitsluitend geaggregeerde teamgemiddelden getoond op de radar- en trendgrafieken.

---

## 5. Koppeling met de Firebase Database

De applicatie maakt gebruik van Firebase Firestore en Authentication voor een veilige, stabiele en realtime opslag.

### 5.1 Configuratie van de koppeling
De databasegegevens worden live ingeladen uit het configuratiebestand `/firebase-applet-config.json` in de hoofdmap van het project. Dit bestand heeft de volgende structuur:

```json
{
  "apiKey": "AIzaSyYOUR_REAL_API_KEY_HERE-xxxxxxxxx",
  "authDomain": "your-app-id.firebaseapp.com",
  "projectId": "your-app-id",
  "storageBucket": "your-app-id.firebasestorage.app",
  "messagingSenderId": "888888888888",
  "appId": "1:888888888888:web:abcdef0123456789abc"
}
```

### 5.2 Veiligheidsregels (Firestore Security Rules)
Om te garanderen dat gebruikers elkaars teamgegevens of stemmen niet onrechtmatig kunnen inzien, dwingt Firebase strikte beveiligingsregels af (`firestore.rules`):
*   Enkel ingelogde en geauthenticeerde gebruikers kunnen gegevens opvragen.
*   Een regulier teamlid mag **alleen** teamgegevens of enquêteresultaten opvragen of indienen indien hun e-mailadres specifiek voorkomt in de arrays (`memberEmails` of `teamAdminEmails`) van dat teamdocument.
*   De Systeembeheerder (Global Admin) wordt volledig anoniem en veilig geverifieerd via de `/admins` collectie in de database. Hierdoor is er **geen** hardcoded emailadres meer aanwezig in de repository-bestanden. In de Firestore Security Rules is de functie `isGlobalAdmin()` beveiligd met:
    ```rules
    function isGlobalAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(currentUserEmail()));
    }
    ```
    *Tip*: Om uzelf of een ander lid als Global Admin te registeren in de database, maakt u eenvoudigweg in uw Firebase Console een document aan in de collectie `admins` met als Document ID het e-mailadres (bijv. `beheerder@domein.nl`) en laat u de inhoud leeg of zet u er `{ "role": "admin" }` in. Dit controleert live en voorkomt lekken in Git!

---

## 6. Veelgestelde vragen & Probleemoplossing

### ❓ Waarom krijgen gebruikers de melding "U bent nog niet ingedeeld"?
Dit gebeurt als het e-mailadres waarmee de gebruiker is ingelogd **niet** voorkomt in het Firestore-teamdocument binnen de velden `memberEmails` of `teamAdminEmails`.

*   **Oplossing**: Log in met uw Systeembeheerdersaccount (ingesteld in de `admins` database collectie). Ga naar het beheerderspaneel en selecteer het team. Voeg het exacte e-mailadres van de gebruiker toe aan de ledenlijst onder "Team Leden (e-mailadressen)" en sla dit op. De gebruiker kan daarna direct inloggen en aan de slag!

### ❓ Hoe voorkom ik "Missing or insufficient permissions" foutmeldingen?
Wanneer er in de browserconsole `FirebaseError: Missing or insufficient permissions` verschijnt, blokkeert Firebase de toegang omdat de opgevraagde query niet overeenkomt met de beveiligingsregels.
*   **Oplossing**: De broncode (`src/App.tsx`) is volledig geoptimaliseerd om gerichte queries te sturen op basis van de ingelogde identiteit (gebruikmakend van `where("memberEmails", "array-contains", email)`). Zorg ervoor dat wijzigingen in de database-structuur of security rules direct gedeployd worden.

---

## 7. Omgevingsvariabelen (Environment Variables)

In het `.env` bestand of de platform-instellingen kunt u de applicatie aanpassen:

*   `VITE_NO_MOCK_DATA`: Stel in op `true` in productieomgevingen om te voorkomen dat er demogegevens worden gesimuleerd in de lokale opslag. Dit zorgt voor een schone start.
*   `VITE_HIDE_SANDBOX`: Indien ingesteld op `true`, wordt de snelle "Sandbox simulator" (waarmee beheerders snel kunnen schakelen tussen testaccounts om de stromen te testen) volledig verborgen voor reguliere eindgebruikers.

---

Veel succes met de **Team Motivatie Checker**! Voor ondersteuning of vragen kunt u contact opnemen met de systeembeheerder.
