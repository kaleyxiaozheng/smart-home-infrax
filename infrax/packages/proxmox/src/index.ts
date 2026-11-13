import * as pulumi from "@pulumi/pulumi";
import * as proxmoxve from "@muhlba91/pulumi-proxmoxve";
import { loadEnvironment, loadSecrets } from "./config"; 
import { createUbuntuTemplate } from "./ubuntu-template";

const environment = loadEnvironment(pulumi.getStack());
const secrets = loadSecrets();

const provider = new proxmoxve.Provider("proxmoxve", {
    endpoint: environment.proxmoxEndpoint,
    apiToken: secrets.proxmoxApiToken,
    insecure: true,
    ssh: {
      agent: false,
      username: "root",
      privateKey: secrets.sshPrivateKey,
    },
  });

  const ubuntuTemplate = createUbuntuTemplate(
    {
      ...environment,
      sshPublicKey: secrets.sshPublicKey,
    },
    provider,
);

export const templateName = ubuntuTemplate.name;
export const templateNode = ubuntuTemplate.nodeName;
export const templateId = pulumi.interpolate`${ubuntuTemplate.nodeName}/${environment.vmId}`;
