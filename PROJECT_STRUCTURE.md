root/
├── package.json
├── src/
│   ├── main/
│   │   ├── index.js          # Electron Main Process
│   │   └── utils.js          # File ops helper
│   ├── api/
│   │   └── MinecraftAPI.js   # Version fetching logic
│   ├── ui/
│   │   ├── index.html        # Main Interface
│   │   ├── input.css         # Tailwind Input
│   │   └── renderer.js       # UI Interactivity
│   └── csharp/
│       ├── NanoBanana.sln
│       └── SystemOps/
│           ├── Program.cs    # Entry point for C# wrapper
│           └── JdkUtils.cs   # JDK Detection logic
├── assets/
│   └── icons/
└── docs/
    └── PACKAGING_GUIDE.md    # Single EXE instructions
