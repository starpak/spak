// BACKWARD-COMPAT RE-EXPORT (since Spak 0.1.x)
// The h/Fragment/escape/parse utilities used to live here alongside core.
// They have been split out into @spakjs/message so CLI / plugin tooling can
// use the message formatter without pulling the full runtime/core deps.
export * from '@spakjs/message'
export { default } from '@spakjs/message'
