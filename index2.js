import pkg1 from '@notionhq/client';
import * as https from 'https';
import axios from 'axios';
import * as cron from 'node-cron'
const { Client } = pkg1;
let notion;
let octokit;
let octokit2;
import Octokat from 'octokat';
import pkg2 from '@octokit/core';
import * as fs from 'fs';
const { Octokit } = pkg2;
let repo;
let main;
let treeItems = [];
async function getPageUpdates() {
    repo = await octokit.repos('43-stuti', 'escape-server').fetch();
    main = await repo.git.refs('heads/docs').fetch();
    let response = await notion.search({
        query:'GSOC'
    });
    if(response.results && response.results.length) {
        let blockId = response.results[0].id;
        await getBlockContent(blockId,'GSOC')
        
         
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
                    for(let i=0;i<obj[obj.type].text.length;i++) {
                        let text = obj[obj.type].text[i];
                        if(obj[obj.type].text[i]['href']) {
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
        axios.get('https://api.github.com/repos/43-stuti/escape-server/contents/public/'+name+'.md',{})
        .then(async(response) =>{
            console.log('RESPONSE',response.data,name);
            let req = {
                owner: '43-stuti',
                repo: 'escape-server',
                path: name+'.md',
                message: 'message',
                content: Buffer.from(string).toString('base64')
            }
            if(response.data.sha) {
                req.sha = response.data.sha
            }
            console.log('REQ',req)
            try {
                await octokit2.request('PUT /repos/{owner}/{repo}/contents/{path}', {
                    owner: '43-stuti',
                    repo: 'escape-server',
                    path: 'public/'+name+'.md',
                    message: 'message',
                    content: Buffer.from(string).toString('base64'),
                    sha : response.data.sha,
                    branch:"master"
                })
                
            } catch(error) {
                console.log('error update found',error,name)
            }
        })
        .catch(async (error) => {
            console.log('ERROR');
            try{
                await octokit2.request('PUT /repos/{owner}/{repo}/contents/{path}', {
                    owner: '43-stuti',
                    repo: 'escape-server',
                    path: 'public/'+name+'.md',
                    message: 'message',
                    content: Buffer.from(string).toString('base64'),
                    branch:"master"
                })
            } catch(error) {
                console.log('error update',error,name)
            }
            
        })
    }

}
async function onStart() {
    fs.readFile('creds.json',async(err,content) => {
        if(err) {
            console.log('error reading file',err);
        } else {
            let keys = JSON.parse(content)
            notion = new Client({ auth: keys.notion })
            octokit = new Octokat({ auth: keys.github });
            octokit2 = new Octokit({ auth: keys.github });
            getPageUpdates();
        }
    })
}
onStart()