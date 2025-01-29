import { SQSEvent } from "aws-lambda";
import { lambdaHandler } from './app';
// @ts-ignore
import nock from 'nock';

const record = (body: string) => ({
    messageId: "059f36b4-87a3-44ab-83d2-661975830a7d",
    receiptHandle: "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
    attributes: {
        ApproximateReceiveCount: "1",
        SentTimestamp: "1545082649183",
        SenderId: "AIDAIENQZJOLO23YVJ4VO",
        ApproximateFirstReceiveTimestamp: "1545082649185"
    },
    messageAttributes: {},
    md5OfBody: "e4e68fb7bd0e697a0ae8f1bb342846b3",
    eventSource: "aws:sqs",
    eventSourceARN: "arn:aws:sqs:us-east-2:123456789012:my-queue",
    awsRegion: "us-east-2",
    body
});

describe("lambda", () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    test('rejects empty input', async () => {
        const event: SQSEvent = { Records: [] };
        await expect(lambdaHandler(event)).rejects.toThrow('No valid records');
    });

    test("empty input is rejected", async () => {
        const event: SQSEvent = {
            Records: []
        }

        const response = lambdaHandler(event);

        await expect(response).rejects.toThrow('No valid records');
    });

    test("input with non-JSON payload is rejected", async () => {
        const event: SQSEvent = {
            Records: [
                record(`invalid json`)
            ]
        };

        const response = lambdaHandler(event);

        await expect(response).rejects.toThrow('No valid records');
    });

    test('filters out invalid JSON payloads', async () => {
        const event: SQSEvent = {
            Records: [record('invalid json')],
        };
        await expect(lambdaHandler(event)).rejects.toThrow('No valid records');
    });

    test("input with mixed payloads is filtered", async () => {
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/tiktok')
            .reply(200, { addonKey: 'tiktok', summary: 'Search less. Find more.' });
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/world')
            .reply(404);
        const event: SQSEvent = {
            Records: [
                record(`{"addon":"world"}`),
                record(`{"addon":"tiktok"}`),
            ]
        }

        const response = lambdaHandler(event);

        await expect(response).resolves.toEqual(expect.arrayContaining(["Unknown app summary"]));
    });

    test("input with mixed valid, and invalid payloads is filtered", async () => {
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/tiktok')
            .reply(200, { addonKey: 'tiktok', summary: 'Search less. Find more.' });
        const event: SQSEvent = {
            Records: [
                record(`{"hello":"world"}`),
                record(`{"addon":"tiktok"}`),
            ]
        }

        const response = lambdaHandler(event);

        await expect(response).resolves.toEqual(expect.not.arrayContaining(["Unknown app summary"]));
    });

    test("input with valid payload resolves", async () => {
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/com.adaptavist.cloud.search')
            .reply(200, { addonKey: 'com.adaptavist.cloud.search', summary: 'Search less. Find more. Enhanced Search makes finding issues in Jira easier, faster and more precise with Enhanced JQL Functions' });

        const event: SQSEvent = {
            Records: [
                record(`{"addon":"com.adaptavist.cloud.search"}`),
            ]
        }

        const response = lambdaHandler(event);

        await expect(response).resolves.toEqual(
            expect.arrayContaining(["Search less. Find more. Enhanced Search makes finding issues in Jira easier, faster and more precise with Enhanced JQL Functions"])
        );
    });

    test("input with valid payloads resolves", async () => {
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/com.adaptavist.cloud.search')
            .reply(200, { addonKey: 'com.adaptavist.cloud.search', summary: 'Search less. Find more. Enhanced Search makes finding issues in Jira easier, faster and more precise with Enhanced JQL Functions' });
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/jql-extensions')
            .reply(200, { addonKey: 'com.adaptavist.cloud.search', summary: 'Organize your issues easily. Major features include advanced searching for attachments, subtasks, comments, versions and links. All keywords can be used in advanced search with autocompletion and saved as filters. No scripting is required.' });
        const event: SQSEvent = {
            Records: [
                record(`{"addon":"com.adaptavist.cloud.search"}`),
                record(`{"addon":"jql-extensions"}`),
            ]
        }

        const response = lambdaHandler(event);

        await expect(response).resolves.toEqual(
            expect.arrayContaining([
                "Search less. Find more. Enhanced Search makes finding issues in Jira easier, faster and more precise with Enhanced JQL Functions",
                "Organize your issues easily. Major features include advanced searching for attachments, subtasks, comments, versions and links. All keywords can be used in advanced search with autocompletion and saved as filters. No scripting is required."
            ])
        );
    });

    test("input with invalid addon key resolves", async () => {
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/com.adaptavist.cloud.search')
            .reply(200, { addonKey: 'com.adaptavist.cloud.search', summary: 'Search less. Find more. Enhanced Search makes finding issues in Jira easier, faster and more precise with Enhanced JQL Functions' });
        nock('https://marketplace.atlassian.com')
            .get('/rest/2/addons/unknown')
            .reply(404);
        const event: SQSEvent = {
            Records: [
                record(`{"addon":"com.adaptavist.cloud.search"}`),
                record(`{"addon":"unknown"}`),
            ]
        }

        const response = lambdaHandler(event);

        await expect(response).resolves.toEqual(
            expect.arrayContaining([
                "Search less. Find more. Enhanced Search makes finding issues in Jira easier, faster and more precise with Enhanced JQL Functions",
                "Unknown app summary"
            ])
        );
    });
});
