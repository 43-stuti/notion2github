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
const owner = 'stuti-43'
let repo;
let main;
let treeItems = [];
let treeItemsImg = [];
let fileNames = [];
let imageUrls = [];
let contentArray = []
async function getPageUpdates() {
    repo = await octokit.repos('43-stuti', 'escape-server').fetch();
    main = await repo.git.refs('heads/docs').fetch();
    let response = await notion.search({
        query:'what'
    });
    if(response.results && response.results.length) {
        let blockId = response.results[0].id;
        await getBlockContent(blockId,'what');
       
        await updateDoc();
        updateImages();
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
                if(obj.type == 'unsupported') {
                    if(obj.image && obj.image.url) {
                        imageUrls.push({
                            base:name,
                            url:obj.image.url
                        });
                    }
                }
            }
        }
        contentArray.push({
            string:string,
            base:name
        })
        
    }

}

async function updateDoc() {
    let addtotree = async(obj) => {
        fileNames.push(obj.base+'.md')
        await prepareTree(Buffer.from(obj.string).toString('base64'),'public/'+obj.base+'.md',treeItems);
    }
    let promiseArr = []
    for (let i = 0; i < contentArray.length; i++) {
        promiseArr.push(addtotree(contentArray[i]));
      }
    await Promise.all(promiseArr);
    await updateRef(treeItems,'Notion doc update','docs','public',fileNames)
}
async function updateImages() {
    let deleteFiles = [];
    let getImg = async(img,i) => {
        return axios
        .get(img.url, {
        responseType: 'arraybuffer'
        })
        .then(async response => {
            console.log('get response');
            deleteFiles.push(img.base+'_'+i+'.png')
            await prepareTree(Buffer.from(response.data, 'binary').toString('base64'),'img/'+img.base+'_'+i+'.png',treeItemsImg);
            return true;
        })
        .catch(err => {
            console.log('error image',err);
            return true;
        })
    }
    let promiseArr = []
    for (let i = 0; i < imageUrls.length; i++) {
        promiseArr.push(getImg(imageUrls[i],i));
      }
    await Promise.all(promiseArr);
    await updateRef(treeItemsImg,'Notion img update','imgs','img',deleteFiles);
}

//github utils
async function prepareTree(content,path,array) {
    let blob = await octokit2.rest.git.createBlob({
        owner:'43-stuti',
        repo:'escape-server',
        content:content,
        encoding:'base64'
      });
    //repo.git.blobs.create({ content: Buffer.from(string).toString('base64') });
    array.push({
        path: path,
        sha: blob.data.sha,
        mode: "100644",
        type: "blob"
    });
}
async function updateRef(treeContent,message,branch,path,deleteArray) {
    let deleteFunc = async (filename) => {
        let filepath = path+"/"+filename;
        console.log('file',filepath);
        return axios.get("https://api.github.com/repos/43-stuti/escape-server/contents/"+filepath,{})
        .then(async(response) => {
            if(response.data.sha) {
                let del = await octokit2.rest.repos.deleteFile({
                    owner: '43-stuti',
                    repo: 'escape-server',
                    path:path+'/'+filename,
                    message:'delete files',
                    sha:response.data.sha,
                });
                console.log('delete')
                return true
            }
            return true
        })
        .catch((error) => {
            console.log('ERROR');
            return true;
        })
    }  


    let tree = await octokit2.rest.git.createTree({
        tree: treeContent,
        owner:'43-stuti',
        repo:'escape-server'
    });
    let commit = await octokit2.rest.git.createCommit({
                    owner:'43-stuti',
                    repo:'escape-server',
                    tree:tree.data.sha,
                    message:message
                })          
    let update = await octokit2.rest.git.updateRef({
        owner:'43-stuti',
        repo:'escape-server',
        ref:'heads/'+branch,
        path:path,
        sha:commit.data.sha,
        force:true
    }); 
    let promises = [];
    for (let i = 0; i < deleteArray.length; i++) {
        promises.push(deleteFunc(deleteArray[i]));
      }
    await Promise.all(promises);
    let merge = octokit2.rest.repos.merge({
                owner:'43-stuti',
                repo:'escape-server',
                base:'master',
                head:branch,
            });
}
//
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