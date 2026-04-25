import axios from './axios';
import API_IPC from "../../../electron/common/apiIPC"
import {getLocalStorage} from "./utils";

export default {

    init(){
        window.ipcRenderer.on(API_IPC.SEARCH, (params) => {
            this.search(params).then(res => {
                window.ipcRenderer.send(API_IPC.SEARCH, res)
            })
        })
    },
    /**
     * 查找
     */
    search(params){
        let apiKey = getLocalStorage("apiKey", "", "String")
        if (apiKey !== ""){
            params = `${params}&apiKey=${apiKey}`
        }
        // 动态获取最新的baseURL
        const customDomain = getLocalStorage("customDomain", "", "String");
        let baseURL = 'https://wallhaven.vip/api/v1';
        if (customDomain && customDomain.trim() !== "") {
            let domain = customDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
            baseURL = `https://${domain}/api/v1`;
        }
        
        return axios.get(`/search?${params}`, {}, baseURL)
    }
}
