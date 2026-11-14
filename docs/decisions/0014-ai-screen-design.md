# 0014 — AI screen follows the Figma design; the three function buttons hide once the chat starts

- **Status:** accepted (2026-11-14). Not implemented yet: today the chips only disappear after the first message (see [0013](0013-single-expo-app.md) for the screen itself).
- **Context:** the AI tab needs one agreed look and one agreed first view, so every slice builds its widgets and screens against the same design.
- **Decision:**
  - **Design source:** the Figma file [Design Systems](https://www.figma.com/design/UIL4elG2t0P7XelTdTqcKI/Design-Systems?node-id=0-1&p=f&t=pXohqGIDXRbMs3AU-0). Its AI screen is the pinned first view of the coach (the view a customer sees when the chat is empty). Colours, fonts, sizes and spacing come from that file.
  - **Function buttons (the three chips):** they are shown on the first view only.
    - When the customer starts typing and sends a message, the three buttons disappear.
    - When the customer picks one of the three functions, the buttons disappear as well.
  - **Getting back to the first view:** the customer can return to the first view (the three-function mode) from a dropdown menu opened by a button at the top of the screen.
  - **Leaving the coach:** the screen has a back button that returns to the app's main page (the Koti tab).
- **Consequences:**
  - `frontend/app/ai.tsx` and `frontend/src/chat/ChatScreen.tsx` are restyled to the design; chat logic and the API do not change.
  - The chips need a visible/hidden state that is reset by the top-bar menu. Choosing a function is a normal chat turn (quick action), not a separate screen.
  - Open details to settle when the screen is built: what else the dropdown contains besides "back to the three functions", whether returning clears the current conversation or only shows the buttons again, and whether "main page" means the Koti tab (assumed here) or the coach's own first view.
- **Reversibility:** easy. It is a UI change on one screen.
