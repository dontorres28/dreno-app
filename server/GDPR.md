# Dreno & your data — in plain words

Dreno keeps some things about you: your name, email, your goals, your journal,
your bookings. EU law (GDPR) says **you are the boss of your own data**. Here is
how that works, in two minutes.

## The three rules we follow

1. **You can see it.** Ask and we give you a copy of everything.
2. **You can delete it.** Ask and it's gone — all of it, for good.
3. **We keep it safe.** We lock the doors so no one else can grab it.

## The two buttons

| You want to… | The app calls… | What happens |
|---|---|---|
| Download my data | `GET /api/me/export` | You get one file, `my-dreno-data.json`, with everything we have about you. |
| Delete my account | `DELETE /api/me` | Your login is erased, and the database automatically wipes every row tied to you. Nothing is kept. |

Both need you to be logged in — so only *you* can see or delete *your* data.

## How we keep the doors locked

- **Secrets stay secret.** Passwords and keys live in `.env` files that are
  never put on the internet or into git.
- **Every request checks who you are.** No valid login, no answer.
- **You only ever touch your own stuff.** A coach only sees an athlete they
  actually work with; you only see your own records.
- **We don't take giant messages.** Requests over 1 MB are refused.

## If something goes wrong

If data ever leaks, GDPR says we must tell the people affected and the
authorities quickly (within 72 hours). Keep a contact email ready for that.

---

That's it. See it, delete it, keep it safe.
