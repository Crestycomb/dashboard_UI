import React, {useState, useEffect} from 'react';
import DomainList from "../domainList/domainList";
import "./main.scss";

import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    useRouteMatch,
    useParams
} from "react-router-dom";
import Sticker from "../sticker/sticker";

function Main(props) {

    return (
        <>
            <div>
                {/*<ul>*/}
                {/*    <li>*/}
                {/*        <Link to="/">Home</Link>*/}
                {/*    </li>*/}
                {/*    <li>*/}
                {/*        <Link to="/about">About</Link>*/}
                {/*    </li>*/}
                {/*    <li>*/}
                {/*        <Link to="/topics">Topics</Link>*/}
                {/*    </li>*/}
                {/*    <li>*/}
                {/*        <Link to="/domains">Domains</Link>*/}
                {/*    </li>*/}
                {/*</ul>*/}

                {/*Switch will only render the first matched <Route/> child.*/}
                <Switch>

                    <Route path="/about">
                        <p>this is the about page</p>
                    </Route>
                    <Route path="/topics">
                        <ExampleComponentStructure/>
                    </Route>

                    <Route path="/domains">
                        {
                            Boolean(props.domainList) &&
                            <DomainList
                                endpoint={props.endpoint}
                                callbackReFetchDomains={props.callbackReFetchDomains}
                                domainList={props.domainList}
                                hasDomainListError={props.hasDomainListError}
                                appendDomainList={props.appendDomainList}
                                changeDomainList={props.changeDomainList}
                            />
                        }
                    </Route>
                    <Route path="/">
                        <StickerList
                            endpoint={props.endpoint}
                            callbackReFetchDomains={props.callbackReFetchDomains}
                            domainList={props.domainList}
                            hasDomainListError={props.hasDomainListError}
                            changeDomainList={props.changeDomainList}
                        />
                    </Route>
                </Switch>
            </div>
        </>
    );
}

function StickerList(props) {
    return (
        <>
            {console.log("checkina")}
            {
                Boolean(props.domainList) === true &&
                props.domainList.map((item) => {
                    return (
                        <SingleService
                            item={item}
                            endpoint={props.endpoint}
                            changeDomainList={props.changeDomainList}
                        />
                    )
                })
            }

        </>
    )
}

function SingleService(props) {
    const [domainPingResponseCode, setDomainPingResponseCode] = useState();
    const [domainPing, setDomainPing] = useState({status: "No response yet"});
    const [domainPingError, setDomainPingError] = useState("false");

    useEffect(() => {
        if (props.item.deleted === false) {
            pingDomain(props.item, props.type);
        }
    }, []);

    async function fetchFromApi(endpoint) {
        const response = await fetch(endpoint);
        const data = await response.json();
        console.log("data: ", data);
        console.log("response: ", response.status);
        setDomainPingResponseCode(response.status);
        console.log("response again: ", response.status);
        return data;
    }

    function pingDomain(d) {
        fetchFromApi(props.endpoint + "api/ping/domain/" + d.id)
            .then(data => {
                setDomainPing(data);

                // if the ping response is not success, refetch that single domain to get last failure date
                if (data.status !== "Success")
                    fetchSingleDomain(props.endpoint)
            })
            .catch(error => {
                console.error("error while fetching domains: " + error);
                setDomainPingError(true);
                setDomainPing("error");
            });
    }

    function fetchSingleDomain(endpoint) {
        fetchFromApi(endpoint + "api/domain/" + props.item.id)
            .then(data => {
                // the updated single domain goes up to be put in the local state in <App/>
                props.changeDomainList(data)
            })
            .catch(error => {
                console.error("error while fetching SINGLE domain:" + error);
            });
    }

    return (
        <>
            {
                props.item.deleted === false && props.item.active === true &&
                <Sticker
                    item={props.item}
                    domainPing={domainPing}
                    domainPingError={domainPingError}
                />
            }
        </>
    )
}

function ExampleComponentStructure() {

    // useRouteMatch gives you access to the match property without rendering a <Route> component.
    // It matches the URL just like a Route would and it accepts an exact, strict, path and sensitive options
    // just like a <Route>
    let match = useRouteMatch();

    return (
        <>
            <div>
                <h2>Topics</h2>

                <ul>
                    <li>
                        <Link to={`${match.url}/components`}>Components</Link>
                    </li>
                    <li>
                        <Link to={`${match.url}/props-v-state`}>
                            Props v. State
                        </Link>
                    </li>
                </ul>

                {/* The Topics page has its own <Switch> with more routes
          that build on the /topics URL path. You can think of the
          2nd <Route> here as an "index" page for all topics, or
          the page that is shown when no topic is selected */}
                <Switch>
                    <Route path={`${match.path}/:topicId`}>
                        <Topic/>

                    </Route>
                    <Route path={match.path}>
                        <h3>Please select a topic.</h3>
                    </Route>
                </Switch>
            </div>
        </>
    )
}

function Topic() {
    let {topicId} = useParams();
    return <h3>Requested topic ID: {topicId}</h3>;
}

export default Main;