import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { createTemplateContext } from './pull_requests';
import { WritableStream } from 'memory-streams';

async function getPreviousTag(currentTag: string): Promise<string> {
    const outputStream = new WritableStream();
    core.info(`Git tags sort currentTag: ${currentTag}`)
    try {
        const returnCode = await exec("git", ["tag", "--sort=-creatordate"], { outStream: outputStream })
        const result = outputStream.toString()
        core.info(`Return Code: ${returnCode}\t${result}`)
        return result
    }catch(error){
        core.info(error)
        return ""
    }
}

async function listPRs(tag1: string, tag2: string): Promise<Array<string>> {
    core.info(`List Pull Requests ${tag1}..${tag2}`)
    if (tag1 == "" || tag2 == ""){
        return []
    }
    const outputStream = new WritableStream();
    await exec("git", ["log", `${tag1}..${tag2}`, "--reverse", "--merges", "--oneline", "--grep='Merge pull request #'"], { outStream: outputStream })
    return outputStream.toString().split("\n").map(line => line.replace("#", "").trim()).filter(it => it != "")
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
    core.info("Render Template")
    const content = renderTemplate(template, context);
    core.setOutput("content", content);
    return null;
}
main().catch((error) => {
    core.setFailed(error.message);
})