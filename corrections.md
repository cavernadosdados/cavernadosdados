### Corrections for AdventurePanel.tsx

1. **Overlay Dismissal**: Consolidate  and the  logic of  to prevent redundant state updates.
2. **Date Filtering**: Replace hardcoded  in  with a utility that ensures local date string comparison to avoid timezone mismatches.
3. **Notify Flag Check**: Update line 308 to  to ensure it only proceeds when explicitly opted in.
4. **Initial Feedback Target**: Ensure  is correctly re-initialized every time the overlay or dialog is opened from a specific session context.
5. **Old Session Prompts**: Update  to fetch *all* pending sessions and prompt for the most recent one, or limit the query to sessions within the last 7 days instead of only 'today', to avoid missing sessions from late nights or timezone shifts.
