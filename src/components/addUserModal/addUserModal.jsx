import React, {Component, useState} from 'react';
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import store from "../../js/store";
import AddDomainModal from "../addDomainModal/addDomainModal";
import Style from './addUserModal.scss';

function AddUserModal(props) {

    return (
        <div>
            <UserModal
                callbackFetch={props.callbackReFetchUsers}
                appendUserList={props.appendUserList}
                endpoint={props.endpoint}/>
        </div>
    );

}

function UserModal(props) {

    const [show, setShow] = useState(false);

    const handleClose = () => {
        setShow(false);
        setPasswordsMatch(true) //after we close and re-enter Modal to have password state reset to default.
    };
    const handleShow = () => setShow(true);

    //Check if passwords match
    
    const [passwordsMatch, setPasswordsMatch] = useState(true);

    const checkPasswordMatch = function check(){
        setPasswordsMatch(document.getElementById("confirmPassword").value == document.getElementById("password").value)
    }

    return (
        <>
            <button  className="Buttonas" onClick={handleShow}>
                New User
            </button>
            <Modal show={show} onHide={handleClose}>
                <div className="forma">
                    <form className="login-form" onSubmit={handleSubmit} id="formForPost" novalidate>
                        <div className="form-group"/>
                        <input type="text" placeholder="Username" name="userName" required/>
                        <input type="text" placeholder="First Name" name="firstName" required/>
                        <input type="text" placeholder="Last Name" name="lastName" required/>
                        <input type="email" placeholder="Email" name="userEmail" required/>
                        <input id="password" type="password" placeholder="Password" name="password" onChange={checkPasswordMatch} pattern="^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[\W_])\S{10,128}$" title="Mininum 10 chars and: atleast one uppercase, lowercase, special character and a number" required/>
                        <input id="confirmPassword" type="password" placeholder="Confirm Password" name="confirmPassword" onChange={checkPasswordMatch} required/>
                        {passwordsMatch ? "":"Passwords don't match"}
                        <hr/>
                        <br/>
                        {/* this is retarded, because it's enabled only if passwords match and doesn't look at other inputs. */}
                        <button type="submit" value="send POST" disabled={!passwordsMatch}>Add</button> 
                        <button onClick={handleClose} >Cancel</button>
                    </form>
                </div>
            </Modal>
        </>
    );

    function handleSubmit(event) {
        try {
            var dataForSending = {
                firstName: event.target.firstName.value,
                lastName: event.target.lastName.value,
                username: event.target.userName.value,
                password: event.target.password.value,
                confirmPassword: event.target.confirmPassword.value,
                userEmail: event.target.userEmail.value
            };
        } catch (error) {
            console.log(error)
        }

        console.log("full object for Posting:", dataForSending);
        console.log("full object for sending JSON:", JSON.stringify(dataForSending));
        submitData(dataForSending);
        handleClose();
        event.preventDefault();
    }

    function submitData(dataForSending) {
        fetchPost(dataForSending)
            .then((response) => {
                console.log("POSTING USER status code = " + response.status);
                if (response.status > 199 && response.status < 300){
                    console.log("success!")
                    dataForSending.role = "User" //pradzioj sukurus visi useriai buna. tik poto galima uzdet admin role.
                    props.appendUserList(dataForSending)
                }

            })

            .catch((error) => {
                console.error("error while fetching users:" + error);
            });
    }
    async function fetchPost(dataForSending) {
        const response = await fetch(props.endpoint + "users/admin/register",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + store.getState().token
                },
                body: JSON.stringify(dataForSending) // body data type must match "Content-Type" header
            }
        );
        const data = await response;
        return data;
    }
}

export default AddUserModal;