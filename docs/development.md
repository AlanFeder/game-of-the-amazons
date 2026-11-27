# Development and hosting

## Local workflow

Serve the application from the repository root with `python3 -m http.server 8000 --directory dist`. Use the HTTP URL so the browser loads the JavaScript modules with the correct origin. Files under `dist/` are checked-in site source and can be edited directly.

Run `node --test` from the repository root. The suite checks the standard opening, movement and blocking, arrows onto and through the vacated square, invalid turns, and save reconstruction across an entire game.

For browser verification, play a complete turn with a mouse and again using the keyboard. On a phone-width screen, repeat with touch and check that the board fits, coordinate labels stay visible, and each stage remains distinguishable. Reload during a provisional move and after a finished turn to check restoration in both cases. Check the rules modal, restart confirmation, and rematch flow.

## Hosting

Deploy the contents of `dist/` as static files over HTTPS. Preserve directory structure and serve `.mjs` files with a JavaScript content type. For ChatGPT Sites, `.openai/hosting.json` identifies the project and points to `dist/` as the static directory. A GitHub push updates the source repository. The private Sites deployment uses its own source and version workflow.

Match data lives in the browser. Changing the hostname or port creates a different storage origin and therefore a separate saved match.
