declare module 'officeparser' {
  function parseOfficeAsync(buffer: Buffer): Promise<string>;
  
  export default {
    parseOfficeAsync
  };
}

