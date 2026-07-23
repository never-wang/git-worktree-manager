import * as vscode from 'vscode';
import { addWorktree } from '@/core/git/addWorktree';
import { getMainFolder } from '@/core/git/getMainFolder';
import { copyWorktreeFiles } from '@/core/util/copyWorktreeFiles';
import { postCreateWorktree } from '@/core/hooks/postCreateWorktree';
import { actionProgressWrapper } from '@/core/ui/progress';
import { withResolvers } from '@/core/util/promise';
import type { ICreateWorktreeInfo } from '@/types';

export async function createWorktreeFromInfo(info: ICreateWorktreeInfo) {
    const { folderPath, name, isBranch, cwd } = info;

    const waitingCreate = withResolvers<void>();
    actionProgressWrapper(
        vscode.l10n.t('Creating worktree {path}', { path: folderPath }),
        () => waitingCreate.promise,
        () => {},
    );
    const created = await addWorktree(folderPath, name, isBranch, cwd);
    waitingCreate.resolve();
    if (!created) {
        return;
    }

    const mainFolder = await getMainFolder(folderPath);
    // Copy files after worktree creation is successful
    if (mainFolder) {
        await copyWorktreeFiles(mainFolder, folderPath);
    }

    await postCreateWorktree({
        worktreePath: folderPath,
        basePath: mainFolder,
    });

    const folderUri = vscode.Uri.file(folderPath);
    vscode.commands.executeCommand('vscode.openFolder', folderUri, {
        forceNewWindow: false,
        forceReuseWindow: true,
    });
}
