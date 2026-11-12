## Layout
```javascript
/* 
packages - code that builds resources 
configs - YAML that describes an environment 
*/
infrax/
|- Pulumi.yaml       /* program entry, like the engine root */
|- package.json
|- tsconfig.json
|- .gitignore
|- packages/
|  |- proxmox/       /* constructs, like packages/opentofu */
|     |- src/
|        |- index.ts              /* provider + exports */
|        |- ubuntu-template.ts    /* VM template resource */
|- configs/
   |- environments/
      |- dev.yaml                 /* sizes, datastore, image, VM id */
```