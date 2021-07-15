import pkg1 from '@notionhq/client';
import * as https from 'https';
import axios from 'axios';
import * as cron from 'node-cron'
const { Client } = pkg1;
let notion;
let octokit;
let octokit2;
import Octokat from 'octokat';
import pkg2 from '@octokit/rest';
import * as fs from 'fs';
const { Octokit } = pkg2;
let repo;
let main;
let treeItems = [];
async function getPageUpdates() {
    repo = await octokit.repos('43-stuti', 'escape-server').fetch();
    main = await repo.git.refs('heads/master').fetch();
    let response = await notion.search({
        query:'Chapters'
    })
    if(response.results && response.results.length) {
        let blockId = response.results[0].id;
        await getBlockContent(blockId,'Chapters')
        let tree = await octokit2.rest.git.createTree({
            tree: treeItems,
            owner:'43-stuti',
            repo:'escape-server'
        });
        console.log('TREE',tree)
        let commit = await octokit2.rest.git.createCommit({
                        owner:'43-stuti',
                        repo:'escape-server',
                        tree:tree.data.sha,
                        message:'Notion update'
                    })
                    
        let update = await octokit2.rest.git.updateRef({
            owner:'43-stuti',
            repo:'escape-server',
            ref:'heads/master',
            sha:commit.data.sha
        });
        console.log('update',update);
    }
    
}
async function getBlockContent(id,name) {
    let pageblock = await notion.blocks.children.list({
        block_id: id
    });
    let string = '';
    if(pageblock.results && pageblock.results.length) {
        for(let i=0;i<pageblock.results.length;i++) {
            let obj = pageblock.results[i];
            if(obj.type == 'child_page') {
                await getBlockContent(obj.id,obj[obj.type].title);
            } else {
                if(obj[obj.type] && obj[obj.type] && obj[obj.type].text) {
                    //console.log('EVER HERE',obj[obj.type].text,obj.type)
                    for(let i=0;i<obj[obj.type].text.length;i++) {
                        let text = obj[obj.type].text[i];
                        //console.log(text['plain_text']);
                        //console.log('OBJ',obj.type)
                        
                        if(obj[obj.type].text[i]['href']) {
                            //console.log('LINK',obj[obj.type].text[i]['href']);
                            string = string + '[' + obj[obj.type].text[i]['plain_text'] + ']';
                            string = string + '(' + obj[obj.type].text[i]['href'] + ')' + '\n';
                        } else {
                            if(obj.type == 'heading_1') {
                                string = string + '# ';
                            }
                            if(obj.type == 'heading_2') {
                                string = string + '## ';
                            }
                            if(obj.type == 'heading_3') {
                                string = string + '### ';
                            }
                            if(obj.type == 'heading_4') {
                                string = string + '#### ';
                            }
                            if(obj.type == 'heading_5') {
                                string = string + '##### ';
                            }
                            if(obj.type == 'heading_6') {
                                string = string + '###### ';
                            }
                            if(obj.type == 'bulleted_list_item') {
                                string = string + '* ';
                            }
                            string = string + obj[obj.type].text[i]['plain_text'] + '\n';
                        }
                        
                    }
                }
            }
        }
        console.log('STRING',name);
        //let content = Buffer.from(string).toString('base64');
        let markdownFile = await octokit2.rest.git.createBlob({
            owner:'43-stuti',
            repo:'escape-server',
            content:Buffer.from(string).toString('base64'),
          });
        
        
        //repo.git.blobs.create({ content: Buffer.from(string).toString('base64') });
        console.log('markdownFile',markdownFile.data.sha)
        treeItems.push({
            path: name+'new'+'.md',
            sha: markdownFile.data.sha,
            mode: "100644",
            type: "blob"
        });
        //check if file exists. 
        
    }

}
async function onStart() {
    fs.readFile('creds.json',async(err,content) => {
        if(err) {
            console.log('error reading file',err);
        } else {
            console.log('keys');
            let keys = JSON.parse(content)
            notion = new Client({ auth: keys.notion })
            octokit = new Octokat({ auth: keys.github });
            octokit2 = new Octokit({ auth: keys.github });
            getPageUpdates();
        }
    })
}
cron.schedule('3 8 * * *',() => {
    console.log('Crin running');
    onStart()
})