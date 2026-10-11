import { RosterListItem } from "../application/studio/StudioRepository";
import { LifeStatus } from "../domain/studio/StudioModels";
import { PortraitStore } from "../application/studio/PortraitStore";
import { PortraitCropDialog } from "./PortraitCropDialog";
import { RosterPanelPort } from "./RosterContracts";
import { StudioDialog } from "./StudioDialog";

/** Handles roster commands and confirmation, independently of DOM creation. */
export class RosterActions {
  constructor(
    private readonly port: RosterPanelPort,
    private readonly dialog: StudioDialog,
    private readonly portraits: PortraitStore,
    private readonly host: HTMLElement,
    private readonly refresh: () => Promise<void>
  ) {}

  async portrait(item: RosterListItem): Promise<void> {
    await this.perform(async () => {
      const path = await new PortraitCropDialog(this.host, this.portraits).open(item.id, item.portraitPath);
      if (!path) return false;
      if (item.source === "main-character") await this.port.updateMainCharacter(item.id, { portraitPath: path });
      else await this.port.updateRosterEntity(item.id, { portraitPath: path });
      return true;
    });
  }

  async rename(item: RosterListItem): Promise<void> {
    const fields = { title: item.title ?? "", firstName: item.firstName, lastName: item.lastName };
    const renamed = await this.dialog.editName(fields, `${item.name} • İsmi düzenle`);
    if (!renamed) return;
    await this.perform(async () => {
      if (item.source === "main-character") await this.port.updateMainCharacter(item.id, renamed);
      else await this.port.updateRosterEntity(item.id, renamed);
      return true;
    });
  }

  async changeLife(item: RosterListItem, currentStatus: LifeStatus): Promise<void> {
    const dying = currentStatus === "living";
    const approved = await this.dialog.confirm({
      title: dying ? "Ölüler listesine taşı?" : "Yaşayanlar listesine taşı?",
      message: `${item.name} ${dying ? "ölü" : "yaşayan"} olarak işaretlenecek. Kayıt ve varsa çanta notu korunacak.`,
      confirmLabel: dying ? "Öldür" : "Dirilt",
      tone: dying ? "danger" : "neutral"
    });
    if (!approved) return;
    await this.perform(async () => {
      const lifeStatus: LifeStatus = dying ? "dead" : "living";
      if (item.source === "main-character") await this.port.updateMainCharacter(item.id, { lifeStatus });
      else await this.port.updateRosterEntity(item.id, { lifeStatus });
      return true;
    });
  }

  async remove(item: RosterListItem): Promise<void> {
    const approved = await this.dialog.confirm({
      title: "Kaydı kalıcı olarak sil?", message: `${item.name} kalıcı olarak silinecek. Ana karakterse çanta notu da silinir. Bu işlem geri alınamaz.`,
      confirmLabel: "Sil", tone: "danger"
    });
    if (!approved) return;
    await this.perform(async () => {
      if (item.source === "main-character") await this.port.deleteMainCharacter(item.id);
      else await this.port.deleteRosterEntity(item.id);
      return true;
    });
  }

  async copyName(name: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(name);
      await this.dialog.alert("İsim kopyalandı", `${name} panoya kopyalandı.`);
    } catch (error) { await this.showError(error); }
  }

  private async perform(operation: () => Promise<boolean>): Promise<void> {
    try { if (await operation()) await this.refresh(); }
    catch (error) { await this.showError(error); }
  }

  private async showError(error: unknown): Promise<void> {
    await this.dialog.alert("İşlem tamamlanamadı", error instanceof Error ? error.message : String(error));
  }
}
