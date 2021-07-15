import pkg1 from '@notionhq/client';
import * as https from 'https';
import axios from 'axios';
const { Client } = pkg1;
import pkg2 from '@octokit/core';
const { Octokit } = pkg2;
const notion = new Client({ auth: "secret_zTIkspNlfOUQYHnRirfN40kPaEvrjZzBiY0d6GhFK84" })
const octokit = new Octokit({ auth: "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" });
async function getPageUpdates() {
    let response = await notion.search({
        query:'Chapters'
    })
    if(response.results && response.results.length) {
        let blockId = response.results[0].id;
        await getBlockContent(blockId,'Chapters')
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
        //check if file exists. 
        axios.get('https://api.github.com/repos/43-stuti/escape-server/contents/'+name+'.md',{})
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
                await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
                    owner: '43-stuti',
                    repo: 'escape-server',
                    path: name+'.md',
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
                await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
                    owner: '43-stuti',
                    repo: 'escape-server',
                    path: name+'.md',
                    message: 'message',
                    content: Buffer.from(string).toString('base64'),
                    branch:"master"
                })
            } catch(error) {
                console.log('error update',error,name)
            }
            
        })
        /*let file = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
            owner: '43-stuti'
            repo: 'escape-server',
            file_sha: name+'.md',
        })*/
        //console.log('FILE',file);
        /*await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: '43-stuti',
            repo: 'escape-server',
            path: name+'.md',
            message: 'message',
            content: Buffer.from(string).toString('base64')
        })*/
    }

}
getPageUpdates();