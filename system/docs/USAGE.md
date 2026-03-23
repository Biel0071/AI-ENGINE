# Usage

## Install / Link

Use as a local workspace module or package dependency.

## Runtime API

- `runCommand(command, options)`
- `scanProject(commandOrEntityName, options)`
- `generateFromPrompt(command, options)`

## Common Commands

- `activate smart decision engine mode`
- `run self-improve now`
- `status self-improving`
- `create module contacts`

## Integration with Copilot

Call engine runtime from your backend assistant/orchestrator layer and pass:
- `projectRoot`
- mode options (`autoApply`, `smartDecisionMode`)

## Safety

The self-improving flow applies only safe changes and avoids destructive refactors.
