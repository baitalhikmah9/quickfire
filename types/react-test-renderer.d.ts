declare module 'react-test-renderer' {
  export interface ReactTestInstance {
    parent: ReactTestInstance | null;
    props: any;
  }
}
