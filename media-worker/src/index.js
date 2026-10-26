import catalogue from '../catalogue.json' with {type:'json'};
import {createGateway} from './gateway.js';
export default createGateway(catalogue);
