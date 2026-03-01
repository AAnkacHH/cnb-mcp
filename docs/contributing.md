# Contributing

Contributions are welcome! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/AAnkacHH/cnb-mcp.git
cd cnb-mcp
npm install
```

## Scripts

| Command                | Description                                |
|------------------------|--------------------------------------------|
| `npm run build`        | Compile TypeScript to `dist/`              |
| `npm run dev`          | Watch mode — recompile on file changes     |
| `npm run typecheck`    | Type checking without emitting             |
| `npm run lint`         | Run ESLint                                 |
| `npm run lint:fix`     | Run ESLint with auto-fix                   |
| `npm run format`       | Format code with Prettier                  |
| `npm run format:check` | Check formatting without writing           |
| `npm run test`         | Run all tests                              |
| `npm run test:watch`   | Run tests in watch mode                    |
| `npm run check`        | Run typecheck + lint + format:check + test |

## Project Structure

```
cnb-mcp/
├── src/
│   ├── index.ts                # Entry point, server setup, resource & prompt
│   ├── types.ts                # TypeScript interfaces for API responses
│   ├── api/
│   │   └── client.ts           # HTTP client for api.cnb.cz
│   ├── tools/
│   │   ├── response.ts         # Shared ok()/fail() response helpers
│   │   ├── exrates.ts          # Exchange rate tools (6)
│   │   ├── fxrates.ts          # FX rate tools (2)
│   │   ├── pribor.ts           # PRIBOR tools (2)
│   │   ├── czeonia.ts          # CZEONIA tool (1)
│   │   ├── forward.ts          # Forward rates tool (1)
│   │   ├── omo.ts              # Open market operations tool (1)
│   │   ├── skd.ts              # Short-term bonds tool (1)
│   │   └── convert.ts          # Currency converter tool (1)
│   └── validators/
│       ├── schemas.ts          # Shared Zod schemas
│       ├── base.ts             # ValidationResult type & helpers
│       ├── convert.ts          # Convert tool validation
│       ├── exrates.ts          # Averages routing validation
│       ├── pribor.ts           # PRIBOR year routing validation
│       └── forward.ts          # Forward routing validation
├── tests/
│   ├── helpers/
│   │   ├── mock-server.ts      # Shared mock MCP server
│   │   ├── mock-client.ts      # cnbFetch mock factory
│   │   └── mock-response.ts    # HTTP Response mock
│   ├── api/
│   │   └── client.test.ts
│   ├── tools/
│   │   └── *.test.ts           # One test file per tool module
│   └── validators/
│       └── *.test.ts           # One test file per validator
├── docs/                       # Documentation
├── .github/workflows/ci.yml    # CI pipeline
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── eslint.config.js
```

## Adding a New Tool

1. Create the tool file in `src/tools/` following existing patterns
2. If the tool needs input validation beyond Zod schemas, create a validator in `src/validators/`
3. Register the tool in `src/index.ts`
4. Add tests in `tests/tools/`
5. Document the tool in `docs/tools.md`
6. Run `npm run check` to verify everything passes

## CI Pipeline

Every push and pull request to `main` triggers the CI workflow:

1. TypeScript type checking
2. ESLint
3. Prettier format check
4. Vitest test suite

All four checks must pass before merging.

## Code Style

- TypeScript strict mode
- ESLint + Prettier for formatting
- ESM modules (`.js` extensions in imports)
- Zod for input validation
- No `any` types, no non-null assertions
