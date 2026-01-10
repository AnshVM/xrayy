#### Cons
- No type enforcing
  - Right now the sdk expects the developer to write methods with certain types
    and can't enforce types using decoraters
    The sdk invalidates invalid input and crashes during runtime

Issues could arise due to internal nameing conventions
like candidate

Bad things i did
- Doing data transformations on client side