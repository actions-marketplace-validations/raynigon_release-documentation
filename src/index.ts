import * as core from '@actions/core';
import { exec, ExecOptions } from '@actions/exec';
import { createTemplateContext } from './pull_requests';

interface ExecReturnOptions {
    stdout(): string
    stderr(): string
}

function execOptions(): ExecOptions & ExecReturnOptions {
    let myOutput = '';
    let myError = '';

    const options = {
        listeners: {
            stdout: (data: Buffer) => {
                myOutput += data.toString();
            },
            stderr: (data: Buffer) => {
                myError += data.toString();
            }
        },
        stdout: () => myOutput,
        stderr: () => myOutput,
    };
    return options
}

async function getPreviousTag(currentTag: string): Promise<string> {
    core.debug(`Find previous tag for: ${currentTag}`)
    const options = execOptions()
    await exec("git", ["tag", "--sort=-creatordate"], options)
    const tags = options.stdout().split("\n")
    core.debug(`Found tags: ${tags}`)
    const currentIndex = tags.findIndex(it => it == currentTag)
    if (tags.length < (currentIndex + 1))
        return ""
    return tags[currentIndex + 1]
}

async function listPRs(tag1: string, tag2: string): Promise<Array<string>> {
    core.debug(`List Pull Requests for range ${tag1}..${tag2}`)
    if (tag1 == "" || tag2 == "") {
        return []
    }
    const options = execOptions()
    await exec("git", ["log", `${tag1}..${tag2}`, "--reverse", "--merges", "--oneline", "--grep='Merge pull request #'"], options)
    return options.stdout().split("\n").map(line => line.replace("#", "").trim()).filter(it => it != "")
}

async function renderTemplate(template: string, context: any): Promise<string> {
    return template
}

async function main() {
    // Input
    const token = core.getInput('token');
    const latestTag = core.getInput('latest');
    const template = core.getInput('template');
    // Calculated Values
    const previousTag = await getPreviousTag(latestTag);
    const prIds = await listPRs(previousTag, latestTag);
    const context = await createTemplateContext(token, prIds);
    // Parse Template
    core.debug("Render Template")
    const content = renderTemplate(template, context);
    core.setOutput("content", content);
    return null;
}
main().catch((error) => {
    core.setFailed(error.message);
})