export interface GenerationParameters {
  name: string;
  description: string;
  argoCdVersion: '3.5.3';
  profile: 'resource-tab';
  registration?: {group?: 'argoproj.io'; kind?: 'Application'; tabTitle?: string};
  dataSource?: 'host-props';
}
