/// <reference types="chai" />

declare namespace Chai {
  interface Assertion {
    shape(expected: any, message?: string): Assertion
  }

  interface Eventually {
    shape(expected: any, message?: string): PromisedAssertion
  }
}

declare module 'chai-shape' {
  const ChaiShape: Chai.ChaiPlugin
  
  export = ChaiShape
}
