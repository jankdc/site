---
title: Stay Hydrated - Learnings from React Router 7
layout: post
date: 2025-10-10
description: Things I've learned whilst working with React Router 7
live: true
---

## Background

When I've been working on React, I've mostly been developing Single Page Applications (or SPAs), where the routing, data loading, and state management happened on the client. As time went on, the ecosystem matured (Backbone.js could be my teenage son), and more concepts have been introduced to put stuff on the screen faster. Server side rendering (SSR) in React became more viable and React frameworks made it somewhat easier for developers to use them.



The discourse between when to use SPAs and SSRs continued. Regardless, I've come to like the idea that the routing and data loading part of the rendering work should be done on the server side by default. Intuitively, the native routing functionality of web clients like the browser, would be more performant and battle-tested than it's re-invented JS version of it. However, obviously with any technical decision, comes with benefits and tradeoffs, but that's a rant that someone else have already made. I wanted to talk about my recent experience with a framework that allowed me to use React's SSR.

<style type="text/css" rel="stylesheet">
.theme-logo {
  content: url(/images/react-router-logo-light.svg);
}

:root[data-theme="dark"] .theme-logo {
  content: url(/images/react-router-logo-dark.svg);
}
</style>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/images/react-router-logo-dark.svg">
  <img class="theme-logo" src="/images/react-router-logo-light.svg" alt="React Router Logo" width="200" height="200">
</picture>

There's a myriad of server-side rendering (SSR) React frameworks out there nowadays, but the weapon of choice at the time was [Remix v2](https://remix.run/). Around the inception of the project, [React Router 7 (RR7) was released](https://remix.run/blog/react-router-v7). It's the spiritual successor to the Remix v2 framework, where it practically moved all of its framework-like features to RR7 and was announced that any ongoing development for Remix v2 will be happening at RR7. Given how early the project was, we saw a chance to migrate.

Working on a framework felt a bit overwhelming for me in the beginning as it required understanding the specific framework's conventions before being able to put stuff on the screen, whereas I only needed to know React when it was just a library. The concepts within RR7 like progressive enhancement and hydration were new, interesting and confusing. However, after playing with it and learning, it has definitely expanded my toolset in expressing solutions in a React codebase. I've made mistakes during the project, which helped me understand those concepts deeper. The following sections below are some of those lessons.

## Grasping Hydration

Feels like everyone just moved ahead in the industry without me and suddenly introduced more ~~problems~~ concepts on how to render HTML. After 6 years since its inception, I've only just gotten over how "magic" hooks are in React. Despite its pragmatic reasoning on why it was introduced, it still breaks the expected execution order of code in a function. This is how I feel about SSR in React. Despite bringing benefits to putting stuff on the screen, it has gotchas, and the most puzzling one to me was hydration.

### New Concepts, New Pains

Anyone working on SSR React would recognize these errors:

```
Warning: Prop `className` did not match. Server: "theme-dark" Client: "theme-light"
Warning: Text content did not match. Server: "Rendered at: 1730000000000" Client: "Rendered at: 1730000050000"
Warning: Expected server HTML to contain a matching <div> in <div>.
Uncaught Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

When hydration fails, React discards the server-rendered HTML and re-renders everything client-side, defeating SSR's purpose. Users see content flash in, disappear, then reappear differently. Layouts shift, text flickers, and theme changes cause jarring light-to-dark mode flashes. Beyond the poor UX, there's a performance cost: React does extra reconciliation work, wasting the server's effort. In severe cases, your page may break with event handlers failing to attach properly.

According to what I've read[^1], hydration is the process where React "attaches" event listeners and makes the static HTML interactive. That's technically true, but it grossly understates what's actually happening under the hood, which is why I kept running into hydration issues without understanding why. I originally thought the server renders your component to HTML, sends it to the browser, and then React just sprinkles some JavaScript magic on top to make the buttons clickable.

### What Actually Happens

The server sends **three separate things** to the browser:

1. **The pre-rendered HTML**: Your component already executed on the server, with all the data resolved and baked into static HTML
2. **The JavaScript bundle**: Your component code as unresolved, executable functions
3. **Serialized loader data**: The data from your loader embedded in a `<script>` tag

I didn't realize that **your component function runs twice.** Once on the server to generate that HTML, and then again on the client during hydration. It's executing your entire component function again from scratch to build its virtual DOM tree.

Let's say you have this route:

```jsx
// routes/dashboard.tsx
export async function loader() {
  return {
    user: await getUser(),
    serverTime: new Date().toISOString(),
  };
}

export default function Dashboard() {
  const { user, serverTime } = useLoaderData();
  const [clientTime] = useState(() => new Date().toISOString());

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Server time: {serverTime}</p>
      <p>Client time: {clientTime}</p>
    </div>
  );
}
```

Here's the timeline of what happens:

**On the server:**

```
1. loader() returns: { user: {...}, serverTime: "2025-10-26T10:00:00.123Z" }
2. Dashboard() executes
  - useState runs
  - new Date() = "2025-10-26T10:00:00.123Z"
3. HTML generated:
<div>
    <h1>Welcome, John</h1>
    <p>Server time: 2025-10-26T10:00:00.123Z</p>
    <p>Client time: 2025-10-26T10:00:00.123Z</p>
</div>
```

**Sent to browser:**

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root">
      <!-- The pre-rendered HTML above -->
    </div>

    <!-- Loader data serialized -->
    <script>
      window.__staticRouterHydrationData = {
        loaderData: {
          "routes/dashboard": {
            user: {...},
            serverTime: "2025-10-26T10:00:00.123Z"
          }
        }
      };
    </script>

    <!-- Your component code as JavaScript -->
    <script src="/assets/client.js"></script>
  </body>
</html>
```

**On the client (hydration):**

```
1. Browser displays the HTML immediately (before JS loads)
2. JavaScript downloads and boots up
3. Dashboard() executes again
   - useLoaderData() reads from window.__staticRouterHydrationData
   - returns: { user: {...}, serverTime: "2025-10-26T10:00:00.123Z" }
   - useState runs AGAIN
     - new Date() = "2025-10-26T10:00:00.456Z"
4. React compares its virtual render with the actual DOM:
   Expected: <p>Client time: 2025-10-26T10:00:00.456Z</p>
   Actual:   <p>Client time: 2025-10-26T10:00:00.123Z</p>

MISMATCH!
```

I thought the component was processed to a final HTML on the server and sent to the client to be processed further. In reality, the component runs again on the client!

Hydration isn't just about "attaching event listeners"; it's React executing your entire component tree again to verify if the server output matches what the client would produce. Any non-deterministic code (time, random, browser APIs) will probably cause mismatches because it's running in two different environments at two different times.

> I've read that [React Router DevTools](https://github.com/forge-42/react-router-devtools) now helps with finding the diff between server-side and client-side rendering when there's hydration issues. I remember this feature not existing when I used it last time so it's worth having a look as part of your debugging toolset.

## Customising Error Pages

<img src="/images/404-page-with-locale-text.webp" alt="fortnite.com's 404 page with locale-specific text" width="800" height="420">

There was a feature where we customised the 404 and 500 error pages with translated texts based on their preferred locale. It's a nice friendly touch (as far as error pages go) for anyone coming across these pages. As part of RR7's error handling, when some parts of the app would error, whether it's the loader, the server rendering of the components or the client rendering thereafter, the `ErrorBoundary` would catch it and render the appropriate error.

To get the translated text, we need the locale preference data from the user's `Request`. Naively, we tried to get that data using the `useLoaderData` when the loader has been resolved:

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const acceptLanguage = request.headers.get("Accept-Language");
  const locale = parseLocale(acceptLanguage); // "en", "es", "fr", etc.

  return {
    locale,
    user: getUser(),
  };
}

export function ErrorBoundary() {
  const { locale } = useLoaderData<typeof loader>();
  const translations = getTranslations(locale);

  return (
    <div>
      <h1>{translations.error.title}</h1>
      <p>{translations.error.message}</p>
    </div>
  );
}
```

This looked reasonable at first glance. However, the problem is that `ErrorBoundary` doesn't just catch errors from your component, it catches errors from your loader too. If your loader throws an error (network failure, database timeout, whatever), there's no loader data to read. When you call `useLoaderData()` in the `ErrorBoundary`, you're trying to access data that never existed, RR7 will throw another error. Now your error boundary itself is erroring, and you end up with the default ugly error screen instead of your nice translated one.

> Note that this applies to the `Layout` component too. See https://reactrouter.com/api/framework-conventions/root.tsx#layout-export as to why.

To get over this, we passed the locale information upon erroring and have fallbacks when the locale isn't available. Here's an example of it:

```tsx
// root.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const acceptLanguage = request.headers.get("Accept-Language");
  const locale = parseLocale(acceptLanguage);

  try {
    const user = await getUser();
    return { locale, user };
  } catch (error) {
    // Attach locale to the error response
    throw json({ locale }, { status: 500 });
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const routeLoaderData = useRouteLoaderData<typeof loader>("root");

  const locale = isRouteErrorResponse(error)
    ? error.data?.locale
    : routeLoaderData?.locale;

  // getTranslations() should contain the mapping from the given locale
  // to a locale-specific translations object, which will be bundled by
  // the bundler (i.e. vite) on the client-side, when imported.
  const translations = getTranslations(locale || "en");

  return (
    <div>
      <h1>{translations.error.title}</h1>
      <p>{translations.error.message}</p>
    </div>
  );
}
```

Engineers can forget to implement this pattern in new loaders so we created a higher order function (HOF) around new/existing loaders for this, to make it less noisier than having a try catch boilerplate on every loader.

In conclusion, I've learnt to be careful around using loader data with RR7's exports (e.g. `meta`, `ErrorBoundary`, `Layout`, `HydrateFallback`) since it's not always available.

## Using AsyncStorage within RR7

**Implicit variables** are values accessible to code without being explicitly passed as parameters but retrieved through ambient mechanisms like React's `Context` API or Node.js' `AsyncStorage`. Such usage usually requires strong justification because it adds an implicit side-effect to functions or components. However, they're particularly useful for avoiding **prop drilling**, where data must be passed through many intermediate components that don't use it themselves.

We had a nice use-case for this when we wanted to feature flag some new business logic. The logic needed to happen in the deepest part of the stack. Particularly, part of the flag's state required the session data so the resolvement needed to happen at the per-request level so you get this kind of scenario:

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const userTier = session.get("tier");

  return asyncLocalStorage.run({ userId, userTier }, async () => {
    // Imagine some deeply nested function being called in
    // `someFunction` is calling `processRecord`
    const data = await someFunction();
    return json({ data });
  });
}

async function processRecord(record: Record) {
  if (await checkFeatureFlag('new-processing-algorithm')) {
    return newProcessingLogic(record);
  }
  return legacyProcessingLogic(record);
}

async function checkFeatureFlag(flagName: string) {
  const context = asyncLocalStorage.getStore();
  return featureFlags.isEnabled(flagName, {
    userId: context.userId,
    tier: context.userTier
  });
}
```

This is a nice start. However, if the feature flag spans across routes, having to setup this `AsyncStorage` boilerplate can be tedious and cognitively noisy so we first tried turning this into a middleware. We were using Express behind the framework so naively attached the async storage context in the Express middleware like so:

```tsx
// server.ts
import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

app.use(async (req, res, next) => {
  const session = await getSession(req.headers.cookie);
  const userId = session.get("userId");
  const userTier = session.get("tier");

  asyncLocalStorage.run({ userId, userTier }, () => {
    next();
  });
});

// ... React Router handler
```

This doesn't work for some reason. It took a lot of debugging and sanity checking to verify this. If I had to guess, it's probably because the execution context between Express and RR7 is different. Luckily, RR7 introduced the concept of [middlewares](https://reactrouter.com/how-to/middleware) in their framework to do something similar:

```tsx
// app/context.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export const asyncLocalStorage = new AsyncLocalStorage<{
  userId: string;
  userTier: string;
}>();

export async function provideContext(
  request: Request,
  cb: () => Promise<Response>
) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const userTier = session.get("tier");

  return asyncLocalStorage.run({ userId, userTier }, cb);
}

export function getContext() {
  return asyncLocalStorage.getStore();
}

// app/root.tsx
import { provideContext } from './context';

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }, next) => {
    return provideContext(request, async () => {
      return await next();
    });
  },
];
```

## Final Thoughts

React development has been evolving more and more into a full-frontal investment in frameworks, each one offering you different strategies of rendering. I managed to get over this hump of learning again because at the end of the day, at it's core, it's still React. However, I do wonder if this amount of complexity around React's scaffolding is necessary and ought to be revised with some fresh eyes.

[^1]: [Gatsby Reference](https://www.gatsbyjs.com/docs/conceptual/react-hydration/#what-is-hydration)