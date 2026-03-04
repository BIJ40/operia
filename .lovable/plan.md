

## Problem

The chatbot system prompt instructs the AI to **invent answers** when documentation doesn't cover the topic:

- Line 94: *"Si l'information n'est pas documentée : tu expliques la logique métier réelle et tu donnes la procédure pratique"*
- Lines 108-111: Same instruction repeated in error handling

This causes the AI to fabricate Apogée procedures (like the fire detection example) that don't exist.

## Solution

Modify the system prompt in `supabase/functions/unified-search/chatService.ts` to enforce **strict RAG-only answers** for Apogée questions:

1. **Replace the RAG usage rule** (line 94): Instead of "explain business logic if not documented", change to: *"Si la documentation ne contient pas l'information, tu le dis clairement. Tu ne devines JAMAIS une procédure Apogée."*

2. **Replace error handling** (lines 106-114): Hard rule — if the docs don't cover it, say so honestly. No guessing, no "logical deduction".

3. **Add a new rule in ÉVITER ABSOLUMENT**: *"Ne jamais inventer ou déduire une procédure Apogée non présente dans la documentation RAG."*

4. **Allow general questions**: The AI can still answer general questions (non-Apogée), but for anything Apogée-specific, it must stick to what's in `<docs>`.

### Key prompt changes

**RAG usage section** becomes:
- The docs are the **only** source of truth for Apogée.
- If the answer isn't in the docs → say it clearly and suggest contacting support or submitting a ticket.
- Never guess, deduce, or extrapolate an Apogée procedure.
- General questions (not about Apogée features) can be answered normally.

**Error handling** becomes:
- *"Cette fonctionnalité n'est pas documentée dans nos guides Apogée. Je ne peux pas vous donner une procédure fiable. Contactez le support ou créez un ticket pour obtenir une réponse vérifiée."*

### Deployment
- Edit `chatService.ts` with the updated prompt
- Redeploy the `unified-search` edge function

