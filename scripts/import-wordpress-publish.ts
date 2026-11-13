// `pnpm import:wordpress:publish` (`payload run` drops arguments, so the mode is set here).
export {};
process.env.IMPORT_PUBLISH = "1";
await import("./import-wordpress");
