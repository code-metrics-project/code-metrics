export enum ConfigVersion {
  V1_0 = "1.0",
  V2_0 = "2.0",
}

export type VersionedConfig = {
  /**
   * The version of the configuration file. This is used to determine how to parse the file.
   * If not present, the "1.0" version is assumed.
   */
  version: ConfigVersion;
};
