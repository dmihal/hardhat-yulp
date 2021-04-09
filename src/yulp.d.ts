
declare module 'yulp' {
  interface Compilation {
    results: string;
    signatures: any[];
    topics: any[];
  }

  interface YulpPackage {
    compile: (source: string) => Compilation
    print: (result: any) => string
  }

  const pkg: YulpPackage;
  export default pkg;
}
