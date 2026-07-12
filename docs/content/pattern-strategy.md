# The Strategy pattern

When you change the "Sort by" dropdown on the shop page — Relevance, Price low→high, Top rated, Biggest discount — the list reorders instantly. Behind that dropdown is a textbook **Strategy pattern**, living in `js/services/catalog.js`.

## The idea

The Strategy pattern says: when you have several **interchangeable ways of doing one thing**, don't write a big `if/else` that hard-codes them. Instead, put each way in its own little function ("a strategy"), keep them in a lookup, and pick one at runtime.

:::analogy Choosing a route in a maps app
A navigation app can route you by *fastest*, *shortest*, or *avoid tolls*. Each is a different **strategy** for the same task ("get me there"). You pick one from a menu and the app plugs it in. It doesn't have one tangled function full of `if fastest … else if shortest …`; it has separate, swappable route-planners. Vestra's sort orders are exactly this menu of strategies.
:::

## The code

Each sort order is a small **comparator** — a function that takes two products and says which comes first. They live together in a frozen lookup object keyed by an id:

```js
// js/services/catalog.js
export const SORTERS = Object.freeze({
  [SORT.RELEVANCE]: null,                                        // keep incoming order
  [SORT.PRICE_ASC]:  (a, b) => usdToInr(a.price) - usdToInr(b.price),
  [SORT.PRICE_DESC]: (a, b) => usdToInr(b.price) - usdToInr(a.price),
  [SORT.RATING]:     (a, b) => b.rating - a.rating,
  [SORT.DISCOUNT]:   (a, b) => b.discountPercentage - a.discountPercentage,
});
```

Choosing a strategy is a **lookup, not a branch**:

```js
// js/services/catalog.js — applyCatalog(...)
const sorter = SORTERS[filters.sort];
if (sorter) filtered.sort(sorter);
```

That's the whole thing. No `switch`, no `if/else` ladder. The chosen `filters.sort` (a string like `'price-asc'`) indexes straight into the table and pulls out the right function.

## The supporting cast

The same file keeps the *labels* for the dropdown and the list of *valid* ids together, so the UI and the validation both come from one source:

```js
export const SORT_OPTIONS = Object.freeze([
  { id: SORT.RELEVANCE,  label: 'Relevance' },
  { id: SORT.PRICE_ASC,  label: 'Price: low to high' },
  { id: SORT.RATING,     label: 'Top rated' },
  // …
]);
export const SORT_IDS = Object.freeze(SORT_OPTIONS.map((o) => o.id));
```

The shop page renders the dropdown from `SORT_OPTIONS` and, when a value comes back from the URL or the `<select>`, validates it against `SORT_IDS` (falling back to Relevance if someone typed nonsense into the address bar — a [guard](#/pattern-guards)).

:::why Why is this better than a big switch statement?
- **Adding a strategy is additive.** A new sort ("Newest") is one new line in `SORTERS` plus one in `SORT_OPTIONS`. You never edit existing logic, so you can't break existing sorts.
- **Each strategy is tiny and testable in isolation.** A comparator is a pure function; you can unit-test "price-asc" without touching the UI.
- **The intent is obvious.** `SORTERS[filters.sort]` reads as *"look up the chosen strategy"*, whereas a 30-line `switch` buries that intent.
- **The valid set is data.** Because the ids come from the same table, the dropdown, the validation, and the sorters can never drift out of sync.
:::

## A subtle nice touch

The `RELEVANCE` strategy is `null` — deliberately. "Relevance" means *keep the order the data already arrived in* (search results come back relevance-ranked). Representing "do nothing" as `null` and guarding with `if (sorter)` is cleaner than inventing a no-op comparator, and it makes the intent explicit: there is genuinely no reordering to do.

## Explaining it out loud

> *"Sorting is a Strategy pattern. Each sort order is a small comparator function, and they all sit in one frozen `SORTERS` table keyed by id. Picking a sort is just looking up the function by its id and calling `array.sort` with it — no `if/else` chain. Adding a new sort is one new entry, and the dropdown labels and valid-id list come from the same place, so nothing drifts."*

Next: hiding a whole messy subsystem behind one friendly function — [The Facade pattern](#/pattern-facade).
