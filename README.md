# ShopFlow

Delt indkøbsliste med automatisk kategorisering og butiksruter.

## Kom i gang lokalt

```bash
npm install
npm run dev
```

Åbn linket terminalen viser (typisk http://localhost:5173).

## Supabase

Projektets database-nøgler ligger allerede i `src/supabaseClient.js`
(de er "publishable"-nøgler, som er lavet til at ligge i frontend-kode).

Før appen kan bruges skal databasetabellen oprettes:

1. Gå til dit Supabase-projekt → **SQL Editor**
2. Kør indholdet af `supabase/schema.sql`
3. Gå til **Table Editor** → `shared_lists` → slå **Realtime** til,
   så ændringer synkroniseres live mellem enheder

## Deploy

1. Push denne mappe til et nyt GitHub-repo:
   ```bash
   git init
   git add -A
   git commit -m "Første version af ShopFlow"
   git branch -M main
   git remote add origin https://github.com/<dit-brugernavn>/<repo-navn>.git
   git push -u origin main
   ```
2. Gå til [vercel.com](https://vercel.com) → **Add New Project** → importér
   repoet. Vercel genkender selv Vite-opsætningen — tryk **Deploy**.
3. Åbn det udstedte link på begge jeres telefoner. Under "Delte lister"
   kan I nu tilslutte jer samme kode og se listen synkronisere live.

## Hvordan data gemmes

- **Mine lister** ligger kun i browserens `localStorage` på den enkelte
  enhed — de deles aldrig.
- **Delte lister** ligger i Supabase-tabellen `shared_lists`, én række
  pr. kode. Alle der indtaster samme kode kan læse og redigere den
  række (se `supabase/schema.sql` for adgangspolitikken).
