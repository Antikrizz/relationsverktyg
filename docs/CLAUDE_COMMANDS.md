# Claude Code — Slash-kommandon

Skapa dessa filer i `.claude/commands/` i projektmappen för att få snabba kommandon i Claude Code.

---

## /project:deploy

**Fil:** `.claude/commands/deploy.md`

```markdown
Publicera appen till GitHub Pages:

```bash
git add -A
git commit -m "$ARGUMENTS"
git push origin main
```

Om inget argument anges, använd commit-meddelande "Uppdatering YYYY-MM-DD".
Appen är live inom 1-2 minuter på GitHub Pages-URL:en.
```

---

## /project:schema

**Fil:** `.claude/commands/schema.md`

```markdown
Visa databasschema för Relationsverktyg:

Tabell: rooms
- id: UUID (PK)
- code: TEXT UNIQUE — delad 6-teckenskod
- p1_name: TEXT — Kristian
- p2_name: TEXT — Elisabet
- created_at: TIMESTAMPTZ

Tabell: entries
- id: UUID (PK)
- room_id: UUID → rooms.id
- partner: TEXT — 'p1' eller 'p2'
- week_num: INTEGER — 1, 2, 3...
- scores: INTEGER[] — 8 Gottman-poäng [1-5]
- reflection: TEXT
- fb_appreciation: TEXT
- fb_wish: TEXT
- fb_insight: TEXT
- submitted_at: TIMESTAMPTZ
- UNIQUE(room_id, partner, week_num)
```

---

## /project:status

**Fil:** `.claude/commands/status.md`

```markdown
Ge en kort statusrapport om projektet:
- Vilka filer finns i projektmappen?
- Vad är det senaste git-committet?
- Finns config.js med Supabase-nycklar?
- Vad är nästa steg enligt ARCHITECTURE.md och BRIEF.md?
```

---

## Hur man skapar kommandona

I terminalen (i projektmappen):

```bash
mkdir -p .claude/commands

cat > .claude/commands/deploy.md << 'EOF'
Publicera appen till GitHub Pages:

```bash
git add -A
git commit -m "$ARGUMENTS"
git push origin main
```
EOF

cat > .claude/commands/schema.md << 'EOF'
[klistra in schema-innehållet ovan]
EOF

cat > .claude/commands/status.md << 'EOF'
[klistra in status-innehållet ovan]
EOF
```
