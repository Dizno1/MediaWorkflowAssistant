Sprint 5 Part 3

Web Address Input and Source Recognition

Added a second way to begin: users can now paste a web address instead of choosing a local file.

Supported in this sprint

- Recognizes standard HTTP and HTTPS addresses.
- Identifies likely video, audio, image, PDF, text, and other web sources from the address.
- Recognizes common YouTube video addresses.
- Shows direct video, audio, image, and PDF sources in the Viewer when the browser allows it.
- Shows YouTube videos in a privacy-enhanced embedded viewer.
- Provides a safe open-in-new-tab link when a source cannot be displayed inside the assistant.
- Presents the same goal-driven choices used for local files.
- Allows users to save a readable information file about a web source.

Accessibility

- The web address field has a visible label and helpful instructions.
- Invalid addresses return focus to the field with a concise status message.
- Embedded viewers have descriptive titles or accessible labels.
- External links clearly describe what will open.
- Existing keyboard and screen reader behavior remains intact.

Privacy and safety

The assistant does not claim to download or inspect content that the browser cannot access. It recognizes the source from the address, displays what the browser supports, and keeps unavailable actions disabled.
