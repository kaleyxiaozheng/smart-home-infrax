import * as proxmoxve from "@muhlba91/pulumi-proxmoxve";
import type { EnvironmentConfig } from "./config";

export interface UbuntuTemplateArgs extends EnvironmentConfig {
  sshPublicKey: string;
}

/**
 * Creates an Ubuntu 22.04 (Jammy) and marks it as a Proxmox template.
 * 
 * Prerequisites on the Proxmox host:
 * - Cloud image upload, e.g. local:iso/jammy-server-clouding-amd64.img
 * - Datastore exists (default: local-lvm)
 * - API token with VM create / template privileges
 */
export function createUbuntuTemplate(
  cfg: UbuntuTemplateArgs,
  provider: proxmoxve.Provider,
): proxmoxve.vm.VirtualMachine {
  return new proxmoxve.vm.VirtualMachine(
    "ubuntu-template",
    {
      name: cfg.templateName,
      nodeName: cfg.nodeName,
      vmID: cfg.vmId,
      template: true,

      memory: {
        dedicated: cfg.memoryMb,
      },

      cpu: {
        cores: cfg.cpuCores,
        sockets: cfg.cpuSockets,
        type: "host",
      },

      machine: "q35",
      bios: "ovmf",
      scsiHardware: "virtio-scsi-pci",

      disks: [
        {
          datastoreId: cfg.datastore,
          fileId: cfg.cloudImageFileId,
          interface: "scsi0",
          size: cfg.diskSizeGb,
          iothread: true,
          discard: "on",
        },
      ],

      networkDevices: [
        {
          bridge: cfg.networkBridge,
          model: "virtio",
          firewall: true,
        },
      ],

      agent: {
        enabled: true,
      },

      initialization: {
        datastoreId: cfg.datastore,
        userAccount: {
          username: cfg.username,
          keys: [cfg.sshPublicKey],
        },
      },
    },
    { provider },
  );
}