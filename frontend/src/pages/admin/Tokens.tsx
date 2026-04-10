import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Paths } from "@/router/paths";
import { Key, KeySquare, Plus, Trash2, Copy, Loader2, AlertTriangle, AlertCircle, CircleCheck } from "lucide-react";
import { format, addDays, isBefore } from "date-fns";
import { toast } from "sonner";
import { listServiceTokens, createServiceToken, revokeServiceToken, type ServiceToken } from "@/services/tokens";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";

export default function Tokens() {
  const { t } = useI18n();
  const breadcrumbs = [
    { label: t("pages:admin.title"), to: Paths.AdminHome },
    { label: t("pages:admin.tokens.title") },
  ];
  const [tokens, setTokens] = useState<ServiceToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [newTokenSubject, setNewTokenSubject] = useState("");
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [tokenToRevoke, setTokenToRevoke] = useState<ServiceToken | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listServiceTokens();
      setTokens(data);
    } catch (error) {
      console.error("Failed to load tokens:", error);
      toast.error(t("pages:admin.tokens.toast.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const isFormValid = newTokenSubject.trim().length >= 3;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy hh:mm a");
    } catch {
      return dateString;
    }
  };

  const isExpiringSoon = (dateString: string) => {
    try {
      const expiryDate = new Date(dateString);
      const warningDate = addDays(new Date(), 30);
      return isBefore(expiryDate, warningDate);
    } catch {
      return false;
    }
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setNewTokenSubject("");
    setNewTokenValue(null);
  };

  const createToken = async () => {
    setCreating(true);
    try {
      const response = await createServiceToken(newTokenSubject);
      setNewTokenValue(response.accessToken);
      await loadTokens();
      toast.success(t("pages:admin.tokens.toast.createSuccess"));
    } catch (error) {
      console.error("Failed to create token:", error);
      toast.error(t("pages:admin.tokens.toast.createError"));
    } finally {
      setCreating(false);
    }
  };

  const confirmRevoke = (token: ServiceToken) => {
    setTokenToRevoke(token);
    setShowRevokeDialog(true);
  };

  const revokeToken = async () => {
    if (!tokenToRevoke) return;
    setRevoking(true);
    try {
      await revokeServiceToken(tokenToRevoke.tokenId);
      setShowRevokeDialog(false);
      setTokenToRevoke(null);
      await loadTokens();
      toast.success(t("pages:admin.tokens.toast.revokeSuccess"));
    } catch (error) {
      console.error("Failed to revoke token:", error);
      toast.error(t("pages:admin.tokens.toast.revokeError"));
    } finally {
      setRevoking(false);
    }
  };

  const copyToken = async () => {
    if (newTokenValue) {
      await navigator.clipboard.writeText(newTokenValue);
      toast.success(t("pages:admin.tokens.toast.copySuccess"));
    }
  };

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-4 pb-4 text-3xl font-bold">{t("pages:admin.tokens.title")}</h2>
          <p className="text-muted-foreground text-base">{t("pages:admin.tokens.description")}</p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("pages:admin.tokens.createButton")}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t("pages:admin.tokens.table.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : tokens.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pages:admin.tokens.table.subject")}</TableHead>
                    <TableHead>{t("pages:admin.tokens.table.created")}</TableHead>
                    <TableHead>{t("pages:admin.tokens.table.expires")}</TableHead>
                    <TableHead>{t("pages:admin.tokens.table.createdBy")}</TableHead>
                    <TableHead className="text-right">{t("pages:admin.tokens.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.tokenId}>
                      <TableCell>{token.sub}</TableCell>
                      <TableCell>{formatDate(token.created)}</TableCell>
                      <TableCell>
                        <Badge variant={isExpiringSoon(token.expires) ? "secondary" : "default"}>
                          {formatDate(token.expires)}
                        </Badge>
                      </TableCell>
                      <TableCell>{token.createdBy}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => confirmRevoke(token)}>
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center">
                <KeySquare className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                <p className="mb-2 text-lg font-semibold">{t("pages:admin.tokens.empty.title")}</p>
                <p className="text-muted-foreground text-sm">{t("pages:admin.tokens.empty.description")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t("pages:admin.tokens.createDialog.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t("pages:admin.tokens.createDialog.subjectLabel")}</Label>
              <Input
                id="subject"
                value={newTokenSubject}
                onChange={(e) => setNewTokenSubject(e.target.value)}
                placeholder={t("pages:admin.tokens.createDialog.subjectPlaceholder")}
              />
              <p className="text-muted-foreground text-xs">{t("pages:admin.tokens.createDialog.subjectHelp")}</p>
            </div>

            {newTokenValue && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CircleCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100">
                  {t("pages:admin.tokens.createDialog.successTitle")}
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <p className="mb-3 text-sm">
                    <strong>{t("pages:admin.tokens.createDialog.importantLabel")}</strong>{" "}
                    {t("pages:admin.tokens.createDialog.importantDescription")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Input value={newTokenValue} readOnly className="bg-background flex-1 font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToken}
                      className="shrink-0 border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog}>
              {newTokenValue
                ? t("pages:admin.tokens.createDialog.doneButton")
                : t("pages:admin.tokens.createDialog.cancelButton")}
            </Button>
            {!newTokenValue && (
              <Button disabled={!isFormValid || creating} onClick={createToken}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("pages:admin.tokens.createDialog.submitButton")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={(open) => !open && setShowRevokeDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t("pages:admin.tokens.revokeDialog.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p>{t("pages:admin.tokens.revokeDialog.confirmMessage")}</p>
            {tokenToRevoke && (
              <div className="text-sm">
                <p>
                  <strong>{t("pages:admin.tokens.revokeDialog.subjectLabel")}:</strong> {tokenToRevoke.sub}
                </p>
                <p>
                  <strong>{t("pages:admin.tokens.revokeDialog.createdLabel")}:</strong>{" "}
                  {formatDate(tokenToRevoke.created)}
                </p>
              </div>
            )}
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("pages:admin.tokens.revokeDialog.warning")}</AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              {t("pages:admin.tokens.revokeDialog.cancelButton")}
            </Button>
            <Button variant="destructive" onClick={revokeToken} disabled={revoking}>
              {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("pages:admin.tokens.revokeDialog.submitButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
